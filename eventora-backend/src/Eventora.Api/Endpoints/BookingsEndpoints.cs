using System.Security.Claims;
using Eventora.Application.Abstractions.Email;
using Eventora.Application.Abstractions.Persistence;
using Eventora.Application.Contracts.Bookings;
using Eventora.Domain.Bookings;
using Eventora.Domain.Notifications;
using Eventora.Domain.Users;

namespace Eventora.Api.Endpoints;

/// <summary>
/// Booking lifecycle endpoints.
/// State machine: Pending → Accepted | Rejected, Accepted → Completed | Cancelled, Pending → Cancelled.
/// Each transition fires a notification to the other party.
/// </summary>
internal static class BookingsEndpoints
{
    public static void MapBookingEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/bookings").WithTags("Bookings").RequireAuthorization();

        group.MapGet("", async (
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var user = await users.GetByIdAsync(userId, ct);
            if (user is null) return Results.Unauthorized();

            IReadOnlyList<Eventora.Domain.Bookings.Booking> result = user.Role switch
            {
                UserRole.Customer => await bookings.GetForCustomerAsync(userId, ct),
                UserRole.Vendor => await bookings.GetForVendorAsync(userId, ct),
                UserRole.Admin => await bookings.GetAllAsync(ct),
                _ => await bookings.GetForCustomerAsync(userId, ct)
            };

            return Results.Ok(result.Select(BookingDtoMapping.ToDto));
        });

        group.MapGet("/{id}", async (
            string id,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var booking = await bookings.GetByIdAsync(id, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });

            var isParticipant = booking.CustomerId == userId || booking.VendorId == userId;
            if (!isParticipant && !principal.IsInRole("admin")) return Results.Forbid();

            return Results.Ok(BookingDtoMapping.ToDto(booking));
        });

        group.MapPost("", async (
            CreateBookingRequest req,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            INotificationRepository notifications,
            IEmailService email,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
            if (!principal.IsInRole("customer")) return Results.Forbid();

            var customer = await users.GetByIdAsync(userId, ct);
            if (customer is null) return Results.Unauthorized();

            var vendor = await users.GetByIdAsync(req.VendorId, ct);
            if (vendor is null || vendor.Role != UserRole.Vendor || !vendor.Approved)
            {
                return Results.BadRequest(new { message = "Vendor is not available" });
            }

            var booking = new Eventora.Domain.Bookings.Booking
            {
                CustomerId = customer.Id,
                CustomerName = customer.FullName,
                VendorId = vendor.Id,
                VendorName = vendor.FullName,
                VendorBusinessName = vendor.BusinessName ?? vendor.FullName,
                Service = req.Service.Trim(),
                EventDate = req.EventDate.Trim(),
                EventType = req.EventType.Trim(),
                GuestCount = req.GuestCount,
                Budget = string.IsNullOrWhiteSpace(req.Budget) ? null : req.Budget.Trim(),
                SpecialRequests = string.IsNullOrWhiteSpace(req.SpecialRequests) ? null : req.SpecialRequests.Trim(),
                Status = BookingStatus.Pending,
            };

            await bookings.CreateAsync(booking, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                vendor.Id,
                NotificationType.BookingRequest,
                "New booking request",
                $"You have a new booking request from {customer.FullName}.",
                relatedBookingId: booking.Id,
                relatedDisputeId: null,
                ct);

            // Email: notify vendor of new booking request
            await email.SendAsync(
                vendor.Email, vendor.BusinessName ?? vendor.FullName,
                "New Booking Request — Eventora",
                $"<p>Hi {vendor.BusinessName ?? vendor.FullName},</p>" +
                $"<p>You have a new booking request from <strong>{customer.FullName}</strong> for <strong>{booking.Service}</strong> on {booking.EventDate}.</p>" +
                $"<p>Log in to Eventora to review and respond.</p>",
                ct);

            return Results.Ok(BookingDtoMapping.ToDto(booking));
        }).RequireAuthorization("CustomerOnly");

        group.MapPost("/{id}/accept", async (
            string id,
            BookingDecisionRequest req,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            IConversationRepository conversations,
            INotificationRepository notifications,
            IEmailService email,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
            if (!principal.IsInRole("vendor")) return Results.Forbid();

            var booking = await bookings.GetByIdAsync(id, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });
            if (booking.VendorId != userId) return Results.Forbid();
            if (booking.Status != BookingStatus.Pending) return Results.BadRequest(new { message = "Booking is not pending" });

            booking.Status = BookingStatus.Accepted;
            booking.VendorResponseNote = string.IsNullOrWhiteSpace(req.VendorResponseNote) ? null : req.VendorResponseNote.Trim();
            await bookings.UpdateAsync(booking, ct);

            // Auto-block the event date on the vendor's calendar so no new bookings can be placed on that day.
            var vendor = await users.GetByIdAsync(booking.VendorId, ct);
            if (vendor is not null && !string.IsNullOrWhiteSpace(booking.EventDate)
                && !vendor.BlockedDates.Contains(booking.EventDate))
            {
                vendor.BlockedDates.Add(booking.EventDate);
                vendor.UpdatedAt = DateTimeOffset.UtcNow;
                await users.UpdateAsync(vendor, ct);
            }

            // Create a booking-linked conversation so the customer and vendor can message each other.
            // We key by BookingId, not by participant pair, so two bookings between the same people
            // get separate threads.
            var existing = await conversations.GetByBookingIdAsync(booking.Id, ct);
            if (existing is null)
            {
                var conversation = new Eventora.Domain.Messaging.Conversation
                {
                    CustomerId = booking.CustomerId,
                    CustomerName = booking.CustomerName,
                    VendorId = booking.VendorId,
                    VendorName = booking.VendorBusinessName,
                    BookingId = booking.Id,
                    LastMessage = "Booking accepted. You can start chatting.",
                    LastMessageTime = DateTimeOffset.UtcNow,
                };

                await conversations.CreateAsync(conversation, ct);
            }

            await NotificationHelpers.CreateAsync(
                notifications,
                booking.CustomerId,
                NotificationType.BookingAccepted,
                "Booking accepted",
                $"Your booking request was accepted by {booking.VendorBusinessName}.",
                relatedBookingId: booking.Id,
                relatedDisputeId: null,
                ct);

            // Email: notify customer that booking was accepted
            var customer = await users.GetByIdAsync(booking.CustomerId, ct);
            if (customer is not null)
            {
                await email.SendAsync(
                    customer.Email, customer.FullName,
                    "Your Booking Has Been Accepted — Eventora",
                    $"<p>Hi {customer.FullName},</p>" +
                    $"<p>Great news! Your booking for <strong>{booking.Service}</strong> on <strong>{booking.EventDate}</strong> has been accepted by <strong>{booking.VendorBusinessName}</strong>.</p>" +
                    $"<p>You can now message the vendor directly through Eventora.</p>",
                    ct);
            }

            return Results.Ok(BookingDtoMapping.ToDto(booking));
        }).RequireAuthorization("VendorOnly");

        group.MapPost("/{id}/reject", async (
            string id,
            BookingDecisionRequest req,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            INotificationRepository notifications,
            IEmailService email,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
            if (!principal.IsInRole("vendor")) return Results.Forbid();

            var booking = await bookings.GetByIdAsync(id, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });
            if (booking.VendorId != userId) return Results.Forbid();
            if (booking.Status != BookingStatus.Pending) return Results.BadRequest(new { message = "Booking is not pending" });

            // SRS §5.5: vendors must provide a response note when rejecting.
            if (string.IsNullOrWhiteSpace(req.VendorResponseNote))
                return Results.BadRequest(new { message = "A response note is required when rejecting a booking" });

            booking.Status = BookingStatus.Rejected;
            booking.VendorResponseNote = req.VendorResponseNote.Trim();
            await bookings.UpdateAsync(booking, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                booking.CustomerId,
                NotificationType.BookingRejected,
                "Booking rejected",
                $"Your booking request was rejected by {booking.VendorBusinessName}.",
                relatedBookingId: booking.Id,
                relatedDisputeId: null,
                ct);

            // Email: notify customer of rejection
            var customerRej = await users.GetByIdAsync(booking.CustomerId, ct);
            if (customerRej is not null)
            {
                await email.SendAsync(
                    customerRej.Email, customerRej.FullName,
                    "Booking Update — Eventora",
                    $"<p>Hi {customerRej.FullName},</p>" +
                    $"<p>Unfortunately, your booking for <strong>{booking.Service}</strong> on <strong>{booking.EventDate}</strong> was not accepted by <strong>{booking.VendorBusinessName}</strong>.</p>" +
                    (string.IsNullOrWhiteSpace(booking.VendorResponseNote) ? "" : $"<p>Vendor note: {booking.VendorResponseNote}</p>") +
                    $"<p>Feel free to browse other vendors on Eventora.</p>",
                    ct);
            }

            return Results.Ok(BookingDtoMapping.ToDto(booking));
        }).RequireAuthorization("VendorOnly");

        group.MapPost("/{id}/cancel", async (
            string id,
            ClaimsPrincipal principal,
            IBookingRepository bookings,
            INotificationRepository notifications,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
            if (!principal.IsInRole("customer")) return Results.Forbid();

            var booking = await bookings.GetByIdAsync(id, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });
            if (booking.CustomerId != userId) return Results.Forbid();
            if (booking.Status is BookingStatus.Completed or BookingStatus.Cancelled) return Results.BadRequest(new { message = "Booking cannot be cancelled" });

            // 2-day cancellation deadline: customers cannot cancel within 2 days of the event.
            if (DateTimeOffset.TryParse(booking.EventDate, out var eventDate))
            {
                var daysUntilEvent = (eventDate.Date - DateTimeOffset.UtcNow.Date).TotalDays;
                if (daysUntilEvent < 2)
                {
                    return Results.BadRequest(new { message = "Bookings cannot be cancelled within 2 days of the event" });
                }
            }

            booking.Status = BookingStatus.Cancelled;
            await bookings.UpdateAsync(booking, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                booking.VendorId,
                NotificationType.BookingRejected,
                "Booking cancelled",
                $"A customer cancelled booking {booking.Id}.",
                relatedBookingId: booking.Id,
                relatedDisputeId: null,
                ct);

            return Results.Ok(BookingDtoMapping.ToDto(booking));
        }).RequireAuthorization("CustomerOnly");

        group.MapPost("/{id}/complete", async (
            string id,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            INotificationRepository notifications,
            IEmailService email,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
            if (!principal.IsInRole("vendor")) return Results.Forbid();

            var booking = await bookings.GetByIdAsync(id, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });
            if (booking.VendorId != userId) return Results.Forbid();
            if (booking.Status != BookingStatus.Accepted) return Results.BadRequest(new { message = "Booking must be accepted to complete" });

            booking.Status = BookingStatus.Completed;
            await bookings.UpdateAsync(booking, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                booking.CustomerId,
                NotificationType.BookingCompleted,
                "Booking completed",
                $"Your booking with {booking.VendorBusinessName} is marked as completed.",
                relatedBookingId: booking.Id,
                relatedDisputeId: null,
                ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                booking.CustomerId,
                NotificationType.ReviewPrompt,
                "Leave a review",
                "Your event is complete. Please leave a review for your vendor.",
                relatedBookingId: booking.Id,
                relatedDisputeId: null,
                ct);

            // Email: notify customer event is complete and prompt review
            var customerCmp = await users.GetByIdAsync(booking.CustomerId, ct);
            if (customerCmp is not null)
            {
                await email.SendAsync(
                    customerCmp.Email, customerCmp.FullName,
                    "Event Completed — Please Leave a Review",
                    $"<p>Hi {customerCmp.FullName},</p>" +
                    $"<p>Your event with <strong>{booking.VendorBusinessName}</strong> has been marked as completed. We hope everything went well!</p>" +
                    $"<p>Please take a moment to <a href=\"http://localhost:3000/customer/bookings\">leave a review</a> for the vendor.</p>",
                    ct);
            }

            return Results.Ok(BookingDtoMapping.ToDto(booking));
        }).RequireAuthorization("VendorOnly");

        // Admin booking monitoring
        var admin = app.MapGroup("/api/admin/bookings").WithTags("Admin").RequireAuthorization("AdminOnly");

        admin.MapGet("", async (IBookingRepository bookings, CancellationToken ct) =>
        {
            var all = await bookings.GetAllAsync(ct);
            return Results.Ok(all.Select(BookingDtoMapping.ToDto));
        });
    }
}
