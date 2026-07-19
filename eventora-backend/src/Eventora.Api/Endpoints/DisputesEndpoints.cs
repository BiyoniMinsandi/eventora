using System.Security.Claims;
using Eventora.Application.Abstractions.Persistence;
using Eventora.Application.Contracts.Disputes;
using Eventora.Domain.Bookings;
using Eventora.Domain.Disputes;
using Eventora.Domain.Notifications;
using Eventora.Domain.Users;

namespace Eventora.Api.Endpoints;

/// <summary>
/// Admin-mediated dispute management endpoints (SRS §4.7).
/// Only customers can raise disputes. Admins update status and resolution.
/// Both parties and the admin can exchange messages within the dispute thread.
/// Messages are blocked once the dispute is Resolved or Closed.
/// </summary>
internal static class DisputesEndpoints
{
    public static void MapDisputesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/disputes").WithTags("Disputes").RequireAuthorization();

        group.MapGet("", async (
            ClaimsPrincipal principal,
            IUserRepository users,
            IDisputeRepository disputes,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var user = await users.GetByIdAsync(userId, ct);
            if (user is null) return Results.Unauthorized();

            IReadOnlyList<Dispute> list = user.Role switch
            {
                Eventora.Domain.Users.UserRole.Admin => await disputes.GetAllAsync(ct),
                Eventora.Domain.Users.UserRole.Vendor => await disputes.GetForVendorAsync(userId, ct),
                _ => await disputes.GetForCustomerAsync(userId, ct)
            };

            return Results.Ok(list.Select(DisputeDtoMapping.ToDto));
        });

        group.MapGet("/{id}", async (
            string id,
            ClaimsPrincipal principal,
            IDisputeRepository disputes,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var dispute = await disputes.GetByIdAsync(id, ct);
            if (dispute is null) return Results.NotFound(new { message = "Dispute not found" });

            var isParticipant = dispute.CustomerId == userId || dispute.VendorId == userId;
            if (!isParticipant && !principal.IsInRole("admin")) return Results.Forbid();

            return Results.Ok(DisputeDtoMapping.ToDto(dispute));
        });

        group.MapPost("", async (
            CreateDisputeRequest req,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            IDisputeRepository disputes,
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

            var existing = await disputes.GetByBookingIdAsync(req.BookingId, ct);
            if (existing is not null && (existing.Status == DisputeStatus.Open || existing.Status == DisputeStatus.InReview))
            {
                return Results.Conflict(new { message = "A dispute already exists for this booking" });
            }

            if (!TryParseCategory(req.Category, out var category))
            {
                return Results.BadRequest(new { message = "Invalid dispute category" });
            }

            var dispute = new Dispute
            {
                BookingId = booking.Id,
                CustomerId = customer.Id,
                CustomerName = customer.FullName,
                VendorId = booking.VendorId,
                VendorName = booking.VendorBusinessName,
                Title = req.Title.Trim(),
                Description = req.Description.Trim(),
                Category = category,
                Evidence = req.Evidence ?? [],
                Status = DisputeStatus.Open,
                Priority = DisputePriority.Medium,
            };

            await disputes.CreateAsync(dispute, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                booking.VendorId,
                NotificationType.DisputeUpdate,
                "New dispute raised",
                $"A customer opened a dispute for booking {booking.Id}.",
                relatedBookingId: booking.Id,
                relatedDisputeId: dispute.Id,
                ct);

            return Results.Ok(DisputeDtoMapping.ToDto(dispute));
        }).RequireAuthorization("CustomerOnly");

        // Vendor-initiated report about a customer (misbehavior, disruption, etc.)
        group.MapPost("/vendor-report", async (
            CreateDisputeRequest req,
            ClaimsPrincipal principal,
            IUserRepository users,
            IBookingRepository bookings,
            IDisputeRepository disputes,
            INotificationRepository notifications,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var vendor = await users.GetByIdAsync(userId, ct);
            if (vendor is null) return Results.Unauthorized();

            var booking = await bookings.GetByIdAsync(req.BookingId, ct);
            if (booking is null) return Results.NotFound(new { message = "Booking not found" });
            if (booking.VendorId != userId) return Results.Forbid();

            if (booking.Status != BookingStatus.Accepted && booking.Status != BookingStatus.Completed)
                return Results.BadRequest(new { message = "You can only report customers for accepted or completed bookings" });

            if (!TryParseCategory(req.Category ?? "behavior", out var category))
                category = DisputeCategory.Behavior;

            var dispute = new Dispute
            {
                BookingId = booking.Id,
                CustomerId = booking.CustomerId,
                CustomerName = booking.CustomerName,
                VendorId = vendor.Id,
                VendorName = vendor.BusinessName ?? vendor.FullName,
                Title = "[Vendor Report] " + req.Title.Trim(),
                Description = req.Description.Trim(),
                Category = category,
                Evidence = req.Evidence ?? [],
                Status = DisputeStatus.Open,
                Priority = DisputePriority.Medium,
            };

            await disputes.CreateAsync(dispute, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                booking.CustomerId,
                NotificationType.DisputeUpdate,
                "A vendor has filed a report about you",
                $"Vendor {vendor.BusinessName ?? vendor.FullName} filed a report for booking {booking.Id}. An admin will review it.",
                relatedBookingId: booking.Id,
                relatedDisputeId: dispute.Id,
                ct);

            return Results.Ok(DisputeDtoMapping.ToDto(dispute));
        }).RequireAuthorization("VendorOnly");

        // Dispute messages — accessible by participants and admin
        group.MapGet("/{id}/messages", async (
            string id,
            ClaimsPrincipal principal,
            IDisputeRepository disputes,
            IDisputeMessageRepository disputeMessages,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var dispute = await disputes.GetByIdAsync(id, ct);
            if (dispute is null) return Results.NotFound(new { message = "Dispute not found" });

            var isParticipant = dispute.CustomerId == userId || dispute.VendorId == userId;
            if (!isParticipant && !principal.IsInRole("admin")) return Results.Forbid();

            var messages = await disputeMessages.GetForDisputeAsync(id, ct);
            return Results.Ok(messages.Select(DisputeMessageDtoMapping.ToDto));
        });

        group.MapPost("/{id}/messages", async (
            string id,
            SendDisputeMessageRequest req,
            ClaimsPrincipal principal,
            IUserRepository users,
            IDisputeRepository disputes,
            IDisputeMessageRepository disputeMessages,
            INotificationRepository notifications,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var sender = await users.GetByIdAsync(userId, ct);
            if (sender is null) return Results.Unauthorized();

            var dispute = await disputes.GetByIdAsync(id, ct);
            if (dispute is null) return Results.NotFound(new { message = "Dispute not found" });

            var isParticipant = dispute.CustomerId == userId || dispute.VendorId == userId;
            if (!isParticipant && !principal.IsInRole("admin")) return Results.Forbid();

            if (dispute.Status == DisputeStatus.Resolved || dispute.Status == DisputeStatus.Closed)
                return Results.BadRequest(new { message = "Cannot send messages on a resolved or closed dispute" });

            var senderRole = sender.Role switch
            {
                UserRole.Admin => "admin",
                UserRole.Vendor => "vendor",
                _ => "customer",
            };

            var message = new DisputeMessage
            {
                DisputeId = id,
                SenderId = sender.Id,
                SenderName = sender.FullName,
                SenderRole = senderRole,
                Content = req.Content.Trim(),
            };

            await disputeMessages.CreateAsync(message, ct);

            // Notify the other participant(s)
            if (sender.Id != dispute.CustomerId)
            {
                await NotificationHelpers.CreateAsync(notifications, dispute.CustomerId,
                    NotificationType.DisputeUpdate, "New message on your dispute",
                    $"{sender.FullName} sent a message on dispute: {dispute.Title}",
                    relatedBookingId: dispute.BookingId, relatedDisputeId: dispute.Id, ct);
            }

            if (sender.Id != dispute.VendorId)
            {
                await NotificationHelpers.CreateAsync(notifications, dispute.VendorId,
                    NotificationType.DisputeUpdate, "New message on dispute",
                    $"{sender.FullName} sent a message on dispute: {dispute.Title}",
                    relatedBookingId: dispute.BookingId, relatedDisputeId: dispute.Id, ct);
            }

            return Results.Ok(DisputeMessageDtoMapping.ToDto(message));
        });

        // Admin updates
        var admin = app.MapGroup("/api/admin/disputes").WithTags("Admin").RequireAuthorization("AdminOnly");

        admin.MapPatch("/{id}", async (
            string id,
            UpdateDisputeRequest req,
            IDisputeRepository disputes,
            INotificationRepository notifications,
            CancellationToken ct) =>
        {
            var dispute = await disputes.GetByIdAsync(id, ct);
            if (dispute is null) return Results.NotFound(new { message = "Dispute not found" });

            if (!string.IsNullOrWhiteSpace(req.Status) && TryParseStatus(req.Status, out var status))
            {
                dispute.Status = status;
            }

            if (!string.IsNullOrWhiteSpace(req.Priority) && TryParsePriority(req.Priority, out var priority))
            {
                dispute.Priority = priority;
            }

            if (req.Resolution is not null)
            {
                dispute.Resolution = string.IsNullOrWhiteSpace(req.Resolution) ? null : req.Resolution.Trim();
            }

            await disputes.UpdateAsync(dispute, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                dispute.CustomerId,
                NotificationType.DisputeUpdate,
                "Dispute updated",
                $"Your dispute {dispute.Id} was updated by an admin.",
                relatedBookingId: dispute.BookingId,
                relatedDisputeId: dispute.Id,
                ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                dispute.VendorId,
                NotificationType.DisputeUpdate,
                "Dispute updated",
                $"Dispute {dispute.Id} was updated by an admin.",
                relatedBookingId: dispute.BookingId,
                relatedDisputeId: dispute.Id,
                ct);

            return Results.Ok(DisputeDtoMapping.ToDto(dispute));
        });
    }

    private static bool TryParseCategory(string value, out DisputeCategory category)
    {
        category = DisputeCategory.Other;
        var v = (value ?? string.Empty).Trim().ToLowerInvariant();
        return v switch
        {
            "quality" => (category = DisputeCategory.Quality) == DisputeCategory.Quality,
            "behavior" => (category = DisputeCategory.Behavior) == DisputeCategory.Behavior,
            "payment" => (category = DisputeCategory.Payment) == DisputeCategory.Payment,
            "schedule" => (category = DisputeCategory.Schedule) == DisputeCategory.Schedule,
            "damage" => (category = DisputeCategory.Damage) == DisputeCategory.Damage,
            "other" => (category = DisputeCategory.Other) == DisputeCategory.Other,
            _ => false,
        };
    }

    private static bool TryParseStatus(string value, out DisputeStatus status)
    {
        status = DisputeStatus.Open;
        var v = (value ?? string.Empty).Trim().ToLowerInvariant().Replace("_", "-");
        return v switch
        {
            "open" => (status = DisputeStatus.Open) == DisputeStatus.Open,
            "in-review" => (status = DisputeStatus.InReview) == DisputeStatus.InReview,
            "resolved" => (status = DisputeStatus.Resolved) == DisputeStatus.Resolved,
            "closed" => (status = DisputeStatus.Closed) == DisputeStatus.Closed,
            _ => false,
        };
    }

    private static bool TryParsePriority(string value, out DisputePriority priority)
    {
        priority = DisputePriority.Medium;
        var v = (value ?? string.Empty).Trim().ToLowerInvariant();
        return v switch
        {
            "low" => (priority = DisputePriority.Low) == DisputePriority.Low,
            "medium" => (priority = DisputePriority.Medium) == DisputePriority.Medium,
            "high" => (priority = DisputePriority.High) == DisputePriority.High,
            _ => false,
        };
    }
}
