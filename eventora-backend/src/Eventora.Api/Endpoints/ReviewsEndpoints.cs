using System.Security.Claims;
using Eventora.Application.Abstractions.Persistence;
using Eventora.Application.Contracts.Reviews;
using Eventora.Domain.Bookings;

namespace Eventora.Api.Endpoints;

internal static class ReviewsEndpoints
{
    public static void MapReviewsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/reviews").WithTags("Reviews");

        group.MapGet("/vendor/{vendorId}", async (string vendorId, IReviewRepository reviews, CancellationToken ct) =>
        {
            var list = await reviews.GetForVendorAsync(vendorId, ct);
            return Results.Ok(list.Select(ReviewDtoMapping.ToDto));
        });

        // Public endpoint for the homepage testimonials — returns the most recent reviews.
        group.MapGet("/recent", async (int? limit, IReviewRepository reviews, IUserRepository users, CancellationToken ct) =>
        {
            var take = Math.Clamp(limit ?? 6, 1, 12);
            var list = await reviews.GetRecentAsync(take, ct);

            var dtos = new List<object>();
            foreach (var r in list)
            {
                var vendor = await users.GetByIdAsync(r.VendorId, ct);
                dtos.Add(new
                {
                    id = r.Id,
                    customerName = r.CustomerName,
                    vendorName = vendor?.BusinessName ?? vendor?.FullName ?? "Vendor",
                    rating = r.Rating,
                    comment = r.Comment,
                    createdAt = r.CreatedAt.ToString("O"),
                });
            }
            return Results.Ok(dtos);
        });

        group.MapPost("", async (
            CreateReviewRequest req,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            IReviewRepository reviews,
            INotificationRepository notifications,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();
            if (!principal.IsInRole("customer")) return Results.Forbid();

            var customer = await users.GetByIdAsync(userId, ct);
            if (customer is null) return Results.Unauthorized();

            var booking = await bookings.GetByIdAsync(req.BookingId, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });
            if (booking.CustomerId != userId) return Results.Forbid();
            if (booking.Status != BookingStatus.Completed) return Results.BadRequest(new { message = "Booking must be completed to review" });

            var existing = await reviews.GetByBookingIdAsync(req.BookingId, ct);
            if (existing is not null) return Results.Conflict(new { message = "You already reviewed this booking" });

            var review = new Eventora.Domain.Reviews.Review
            {
                BookingId = booking.Id,
                CustomerId = customer.Id,
                CustomerName = customer.FullName,
                VendorId = booking.VendorId,
                Rating = req.Rating,
                Comment = req.Comment.Trim(),
            };

            await reviews.CreateAsync(review, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                booking.VendorId,
                Eventora.Domain.Notifications.NotificationType.ReviewPrompt,
                "New review received",
                $"{customer.FullName} left you a review.",
                relatedBookingId: booking.Id,
                relatedDisputeId: null,
                ct);

            return Results.Ok(ReviewDtoMapping.ToDto(review));
        }).RequireAuthorization("CustomerOnly");

        // ── Admin review management ──────────────────────────────────────────
        var adminReviews = app.MapGroup("/api/admin/reviews").WithTags("Admin").RequireAuthorization("AdminOnly");

        adminReviews.MapGet("", async (IReviewRepository reviews, IUserRepository users, CancellationToken ct) =>
        {
            var list = await reviews.GetRecentAsync(500, ct);
            var dtos = new List<object>();
            foreach (var r in list)
            {
                var vendor = await users.GetByIdAsync(r.VendorId, ct);
                dtos.Add(new
                {
                    id = r.Id,
                    bookingId = r.BookingId,
                    customerId = r.CustomerId,
                    customerName = r.CustomerName,
                    vendorId = r.VendorId,
                    vendorName = vendor?.BusinessName ?? vendor?.FullName ?? "Vendor",
                    rating = r.Rating,
                    comment = r.Comment,
                    createdAt = r.CreatedAt.ToString("O"),
                });
            }
            return Results.Ok(dtos);
        });

        adminReviews.MapGet("/booking/{bookingId}", async (string bookingId, IReviewRepository reviews, CancellationToken ct) =>
        {
            var review = await reviews.GetByBookingIdAsync(bookingId, ct);
            if (review is null) return Results.NotFound(new { message = "No review found for this booking" });
            return Results.Ok(ReviewDtoMapping.ToDto(review));
        });

        adminReviews.MapDelete("/{id}", async (string id, IReviewRepository reviews, CancellationToken ct) =>
        {
            var all = await reviews.GetRecentAsync(500, ct);
            var review = all.FirstOrDefault(r => r.Id == id);
            if (review is null) return Results.NotFound(new { message = "Review not found" });
            await reviews.DeleteAsync(id, ct);
            return Results.Ok(new { success = true, message = "Review deleted" });
        });
    }
}
