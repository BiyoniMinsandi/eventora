using System.Security.Claims;
using Eventora.Application.Abstractions.Persistence;
using Eventora.Domain.Bookings;
using Eventora.Domain.Payments;
using Stripe;
using Stripe.Checkout;

namespace Eventora.Api.Endpoints;

/// <summary>
/// Stripe payment endpoints.
/// Flow: POST /api/payments/checkout → Stripe Checkout Session → redirect → webhook confirms payment.
/// </summary>
internal static class PaymentEndpoints
{
    public static void MapPaymentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/payments").WithTags("Payments").RequireAuthorization();

        // Create a Stripe Checkout Session for an accepted booking
        group.MapPost("/checkout", async (
            CreateCheckoutRequest req,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            IPaymentRepository payments,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
            if (!principal.IsInRole("customer")) return Results.Forbid();

            var booking = await bookings.GetByIdAsync(req.BookingId, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });
            if (booking.CustomerId != userId) return Results.Forbid();
            if (booking.Status != BookingStatus.Accepted)
                return Results.BadRequest(new { message = "Payment is only allowed for accepted bookings" });

            if (booking.PaymentStatus == "paid")
                return Results.BadRequest(new { message = "Booking is already paid" });

            var stripeKey = config["Stripe:SecretKey"];
            if (string.IsNullOrWhiteSpace(stripeKey))
                return Results.Problem(detail: "Payment gateway is not configured", statusCode: 503);

            StripeConfiguration.ApiKey = stripeKey;

            var frontendUrl = config["App:FrontendUrl"] ?? "http://localhost:3000";
            var amountInCents = booking.AmountInCents ?? req.AmountInCents;

            if (amountInCents <= 0)
                return Results.BadRequest(new { message = "A valid amount is required to proceed with payment" });

            var currency = (config["Stripe:Currency"] ?? "usd").ToLowerInvariant();

            var sessionOptions = new SessionCreateOptions
            {
                PaymentMethodTypes = ["card"],
                LineItems =
                [
                    new SessionLineItemOptions
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            UnitAmount = amountInCents,
                            Currency = currency,
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = $"Eventora Booking – {booking.Service}",
                                Description = $"Event: {booking.EventType} on {booking.EventDate} with {booking.VendorBusinessName}",
                            },
                        },
                        Quantity = 1,
                    }
                ],
                Mode = "payment",
                SuccessUrl = $"{frontendUrl}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl = $"{frontendUrl}/payment/cancel?booking_id={booking.Id}",
                Metadata = new Dictionary<string, string>
                {
                    ["booking_id"] = booking.Id,
                    ["customer_id"] = userId,
                },
                ClientReferenceId = booking.Id,
            };

            var service = new SessionService();
            var session = await service.CreateAsync(sessionOptions, cancellationToken: ct);

            var payment = new Eventora.Domain.Payments.Payment
            {
                BookingId = booking.Id,
                CustomerId = userId,
                VendorId = booking.VendorId,
                AmountInCents = amountInCents,
                Currency = currency,
                Status = PaymentStatus.Pending,
                StripeSessionId = session.Id,
                Description = $"Booking for {booking.Service}",
            };

            await payments.CreateAsync(payment, ct);

            booking.PaymentId = payment.Id;
            booking.AmountInCents = amountInCents;
            booking.Currency = currency;
            await bookings.UpdateAsync(booking, ct);

            return Results.Ok(new { checkoutUrl = session.Url, sessionId = session.Id, paymentId = payment.Id });
        });

        // Get payment status for a booking
        group.MapGet("/booking/{bookingId}", async (
            string bookingId,
            ClaimsPrincipal principal,
            IBookingRepository bookings,
            IPaymentRepository payments,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var booking = await bookings.GetByIdAsync(bookingId, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });

            var isParticipant = booking.CustomerId == userId || booking.VendorId == userId;
            if (!isParticipant && !principal.IsInRole("admin")) return Results.Forbid();

            var payment = await payments.GetByBookingIdAsync(bookingId, ct);
            if (payment is null) return Results.Ok(new { status = "unpaid", payment = (object?)null });

            return Results.Ok(new
            {
                status = ToApiStatus(payment.Status),
                payment = new
                {
                    id = payment.Id,
                    amountInCents = payment.AmountInCents,
                    currency = payment.Currency,
                    status = ToApiStatus(payment.Status),
                    createdAt = payment.CreatedAt.ToString("O"),
                }
            });
        });

        // Customer payment history
        group.MapGet("/my", async (
            ClaimsPrincipal principal,
            IPaymentRepository payments,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var list = await payments.GetForCustomerAsync(userId, ct);
            return Results.Ok(list.Select(p => new
            {
                id = p.Id,
                bookingId = p.BookingId,
                amountInCents = p.AmountInCents,
                currency = p.Currency,
                status = ToApiStatus(p.Status),
                createdAt = p.CreatedAt.ToString("O"),
            }));
        });

        // Verify session after redirect from Stripe — intentionally allows anonymous access.
        // The Stripe session_id is a secure, unguessable token that proves payment.
        app.MapPost("/api/payments/verify-session", async (
            VerifySessionRequest req,
            ClaimsPrincipal principal,
            IBookingRepository bookings,
            IPaymentRepository payments,
            INotificationRepository notifications,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var stripeKey = config["Stripe:SecretKey"];
            if (string.IsNullOrWhiteSpace(stripeKey))
                return Results.Problem(detail: "Payment gateway is not configured", statusCode: 503);

            StripeConfiguration.ApiKey = stripeKey;

            var sessionService = new SessionService();
            Session session;
            try
            {
                session = await sessionService.GetAsync(req.SessionId, cancellationToken: ct);
            }
            catch
            {
                return Results.BadRequest(new { message = "Invalid session ID" });
            }

            var payment = await payments.GetByStripeSessionIdAsync(req.SessionId, ct);
            if (payment is null) return Results.NotFound(new { message = "Payment not found" });

            if (session.PaymentStatus == "paid" && payment.Status != PaymentStatus.Completed)
            {
                payment.Status = PaymentStatus.Completed;
                payment.StripePaymentIntentId = session.PaymentIntentId;
                await payments.UpdateAsync(payment, ct);

                var booking = await bookings.GetByIdAsync(payment.BookingId, ct);
                if (booking is not null)
                {
                    booking.PaymentStatus = "paid";
                    await bookings.UpdateAsync(booking, ct);

                    await NotificationHelpers.CreateAsync(
                        notifications,
                        booking.VendorId,
                        Eventora.Domain.Notifications.NotificationType.BookingCompleted,
                        "Payment received",
                        $"Payment for booking {booking.Id} has been received.",
                        relatedBookingId: booking.Id,
                        relatedDisputeId: null,
                        ct);
                }
            }

            return Results.Ok(new
            {
                paymentStatus = session.PaymentStatus,
                bookingId = payment.BookingId,
                amountInCents = payment.AmountInCents,
                currency = payment.Currency,
            });
        });

        // Stripe webhook — receives events from Stripe's servers
        app.MapPost("/api/payments/webhook", async (
            HttpContext ctx,
            IBookingRepository bookings,
            IPaymentRepository payments,
            INotificationRepository notifications,
            IConfiguration config) =>
        {
            var webhookSecret = config["Stripe:WebhookSecret"];
            if (string.IsNullOrWhiteSpace(webhookSecret))
                return Results.Ok(); // webhook not configured, skip silently

            string json;
            using (var reader = new StreamReader(ctx.Request.Body))
                json = await reader.ReadToEndAsync();

            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(
                    json,
                    ctx.Request.Headers["Stripe-Signature"],
                    webhookSecret,
                    throwOnApiVersionMismatch: false);
            }
            catch
            {
                return Results.BadRequest();
            }

            using var whCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var whCt = whCts.Token;

            if (stripeEvent.Type == EventTypes.CheckoutSessionCompleted)
            {
                if (stripeEvent.Data.Object is not Session session) return Results.Ok();

                var payment = await payments.GetByStripeSessionIdAsync(session.Id, whCt);
                if (payment is not null && payment.Status != PaymentStatus.Completed)
                {
                    payment.Status = PaymentStatus.Completed;
                    payment.StripePaymentIntentId = session.PaymentIntentId;
                    await payments.UpdateAsync(payment, whCt);

                    var booking = await bookings.GetByIdAsync(payment.BookingId, whCt);
                    if (booking is not null)
                    {
                        booking.PaymentStatus = "paid";
                        await bookings.UpdateAsync(booking, whCt);

                        await NotificationHelpers.CreateAsync(
                            notifications,
                            booking.VendorId,
                            Eventora.Domain.Notifications.NotificationType.BookingCompleted,
                            "Payment received",
                            $"Payment for booking {booking.Id} confirmed via Stripe.",
                            relatedBookingId: booking.Id,
                            relatedDisputeId: null,
                            whCt);
                    }
                }
            }
            else if (stripeEvent.Type == EventTypes.ChargeRefunded)
            {
                if (stripeEvent.Data.Object is not Charge charge) return Results.Ok();

                var payment = await payments.GetByStripeSessionIdAsync(charge.PaymentIntentId ?? "", whCt);
                if (payment is not null)
                {
                    payment.Status = PaymentStatus.Refunded;
                    await payments.UpdateAsync(payment, whCt);

                    var booking = await bookings.GetByIdAsync(payment.BookingId, whCt);
                    if (booking is not null)
                    {
                        booking.PaymentStatus = "refunded";
                        await bookings.UpdateAsync(booking, whCt);
                    }
                }
            }

            return Results.Ok();
        }).WithTags("Payments");
    }

    private static string ToApiStatus(PaymentStatus status) => status switch
    {
        PaymentStatus.Pending => "pending",
        PaymentStatus.Processing => "processing",
        PaymentStatus.Completed => "paid",
        PaymentStatus.Failed => "failed",
        PaymentStatus.Refunded => "refunded",
        PaymentStatus.Cancelled => "cancelled",
        _ => "unknown",
    };
}

public sealed record CreateCheckoutRequest(string BookingId, long AmountInCents);
public sealed record VerifySessionRequest(string SessionId);
