using System.Security.Claims;
using Eventora.Application.Abstractions.Email;
using Eventora.Application.Abstractions.Persistence;
using Eventora.Application.Contracts.Users;
using Eventora.Domain.Users;

namespace Eventora.Api.Endpoints;

/// <summary>
/// Vendor discovery and admin approval endpoints.
/// The public listing (GET /api/vendors) requires no authentication so customers
/// can browse before logging in.
/// </summary>
internal static class VendorsEndpoints
{
    public static void MapVendorEndpoints(this WebApplication app)
    {
        // Public vendor listing — no auth required
        var vendors = app.MapGroup("/api/vendors").WithTags("Vendors");

        vendors.MapGet("", async (string? search, string? category, string? location, int? minPrice, int? maxPrice, IUserRepository users, CancellationToken ct) =>
        {
            var all = await users.FindVendorsAsync(approvedOnly: true, ct);

            var query = all.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLowerInvariant();
                query = query.Where(v =>
                    (v.BusinessName ?? "").ToLowerInvariant().Contains(s) ||
                    v.FullName.ToLowerInvariant().Contains(s) ||
                    (v.Description ?? "").ToLowerInvariant().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(category) && category.Trim().ToLowerInvariant() != "all")
            {
                var c = category.Trim().ToLowerInvariant();
                query = query.Where(v => (v.Category ?? "").Trim().ToLowerInvariant() == c);
            }

            if (!string.IsNullOrWhiteSpace(location))
            {
                var l = location.Trim().ToLowerInvariant();
                query = query.Where(v => (v.Location ?? "").Trim().ToLowerInvariant().Contains(l));
            }

            // Price range: include vendors whose range overlaps the requested window.
            // A vendor without numeric prices (PriceMin/PriceMax null) is always included.
            if (minPrice.HasValue)
                query = query.Where(v => v.PriceMax == null || v.PriceMax >= minPrice.Value);

            if (maxPrice.HasValue)
                query = query.Where(v => v.PriceMin == null || v.PriceMin <= maxPrice.Value);

            return Results.Ok(query.Select(UserDtoMapping.ToDto));
        });

        vendors.MapGet("/{id}", async (string id, IUserRepository users, CancellationToken ct) =>
        {
            var vendor = await users.GetByIdAsync(id, ct);
            if (vendor is null || vendor.Role != UserRole.Vendor) return Results.NotFound(new { message = "Vendor not found" });
            if (!vendor.Approved) return Results.NotFound(new { message = "Vendor not found" });

            return Results.Ok(UserDtoMapping.ToDto(vendor));
        });

        // Vendor self endpoints
        var me = vendors.MapGroup("/me").RequireAuthorization("VendorOnly");

        me.MapGet("", async (ClaimsPrincipal principal, IUserRepository users, CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var user = await users.GetByIdAsync(userId, ct);
            if (user is null || user.Role != UserRole.Vendor) return Results.NotFound(new { message = "Vendor not found" });

            return Results.Ok(UserDtoMapping.ToDto(user));
        });

        // Admin approvals
        var admin = app.MapGroup("/api/admin/vendors").WithTags("Admin").RequireAuthorization("AdminOnly");

        admin.MapGet("/pending", async (IUserRepository users, CancellationToken ct) =>
        {
            var allVendors = await users.FindVendorsAsync(approvedOnly: false, ct);
            var pending = allVendors.Where(v => v.Role == UserRole.Vendor && !v.Approved && v.RejectedAt is null);
            return Results.Ok(pending.Select(UserDtoMapping.ToDto));
        });

        admin.MapPost("/{id}/approve", async (string id, IUserRepository users, INotificationRepository notifications, IEmailService email, CancellationToken ct) =>
        {
            var vendor = await users.GetByIdAsync(id, ct);
            if (vendor is null || vendor.Role != UserRole.Vendor) return Results.NotFound(new { message = "Vendor not found" });

            vendor.Approved = true;
            vendor.ApprovedAt = DateTimeOffset.UtcNow;
            vendor.RejectedAt = null;
            vendor.RejectionReason = null;
            await users.UpdateAsync(vendor, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                vendor.Id,
                Eventora.Domain.Notifications.NotificationType.VendorApproved,
                "Vendor account approved",
                "Your vendor account has been approved by an admin.",
                relatedBookingId: null,
                relatedDisputeId: null,
                ct);

            var displayName = vendor.BusinessName ?? vendor.FullName;
            await email.SendAsync(
                vendor.Email,
                displayName,
                "Your Eventora vendor account has been approved!",
                $"""
                <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
                  <div style="margin-bottom:24px">
                    <span style="font-size:20px;font-weight:700;color:#1d4ed8">Eventora</span>
                  </div>
                  <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">You're approved! 🎉</h1>
                  <p style="color:#555;margin:0 0 20px">Hi {displayName},<br><br>
                  Your vendor account on <strong>Eventora</strong> has been reviewed and approved by our team.
                  You can now log in and start accepting bookings.</p>
                  <a href="https://eventora-ecdn.vercel.app/login"
                     style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
                    Log In to Eventora
                  </a>
                  <p style="color:#888;font-size:12px;margin-top:32px">
                    If you did not register on Eventora, you can ignore this email.
                  </p>
                </div>
                """,
                ct);

            return Results.Ok(UserDtoMapping.ToDto(vendor));
        });

        admin.MapPost("/{id}/reject", async (string id, RejectVendorRequest req, IUserRepository users, INotificationRepository notifications, IEmailService email, CancellationToken ct) =>
        {
            var vendor = await users.GetByIdAsync(id, ct);
            if (vendor is null || vendor.Role != UserRole.Vendor) return Results.NotFound(new { message = "Vendor not found" });

            vendor.Approved = false;
            vendor.RejectedAt = DateTimeOffset.UtcNow;
            vendor.RejectionReason = string.IsNullOrWhiteSpace(req.Reason) ? "Rejected by admin" : req.Reason.Trim();
            await users.UpdateAsync(vendor, ct);

            await NotificationHelpers.CreateAsync(
                notifications,
                vendor.Id,
                Eventora.Domain.Notifications.NotificationType.VendorRejected,
                "Vendor account rejected",
                vendor.RejectionReason,
                relatedBookingId: null,
                relatedDisputeId: null,
                ct);

            var displayName = vendor.BusinessName ?? vendor.FullName;
            await email.SendAsync(
                vendor.Email,
                displayName,
                "Update on your Eventora vendor application",
                $"""
                <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111">
                  <div style="margin-bottom:24px">
                    <span style="font-size:20px;font-weight:700;color:#1d4ed8">Eventora</span>
                  </div>
                  <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">Application update</h1>
                  <p style="color:#555;margin:0 0 16px">Hi {displayName},<br><br>
                  Thank you for applying to join Eventora as a vendor. After reviewing your application,
                  we are unable to approve your account at this time.</p>
                  {(string.IsNullOrWhiteSpace(vendor.RejectionReason) ? "" :
                    $"<p style=\"color:#555;margin:0 0 16px\"><strong>Reason:</strong> {vendor.RejectionReason}</p>")}
                  <p style="color:#555;margin:0 0 20px">You are welcome to reapply once the issue has been addressed.</p>
                  <p style="color:#888;font-size:12px;margin-top:32px">
                    If you have questions, reply to this email or contact Eventora support.
                  </p>
                </div>
                """,
                ct);

            return Results.Ok(UserDtoMapping.ToDto(vendor));
        });
    }
}

public sealed record RejectVendorRequest(string? Reason);
