using System.Security.Claims;
using Eventora.Application.Abstractions.Persistence;
using Eventora.Application.Abstractions.Security;
using Eventora.Application.Contracts.Users;
using Eventora.Domain.Users;

namespace Eventora.Api.Endpoints;

/// <summary>
/// User profile and account management endpoints.
/// Vendor-specific fields are silently ignored when the caller is a customer or admin.
/// </summary>
internal static class UsersEndpoints
{
    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users").RequireAuthorization();

        group.MapGet("/me", async (ClaimsPrincipal principal, IUserRepository users, CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var user = await users.GetByIdAsync(userId, ct);
            if (user is null) return Results.NotFound(new { message = "User not found" });

            return Results.Ok(UserDtoMapping.ToDto(user));
        });

        group.MapPut("/me", async (
            ClaimsPrincipal principal,
            UpdateMeRequest req,
            IUserRepository users,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var user = await users.GetByIdAsync(userId, ct);
            if (user is null) return Results.NotFound(new { message = "User not found" });

            if (!string.IsNullOrWhiteSpace(req.FullName)) user.FullName = req.FullName.Trim();
            user.Phone = string.IsNullOrWhiteSpace(req.Phone) ? user.Phone : req.Phone.Trim();

            // Vendor-only fields
            if (user.Role == UserRole.Vendor)
            {
                user.BusinessName = req.BusinessName ?? user.BusinessName;
                user.Category = req.Category ?? user.Category;
                user.Location = req.Location ?? user.Location;
                user.Description = req.Description ?? user.Description;
                user.Photos = req.Photos ?? user.Photos;
                user.Services = req.Services ?? user.Services;
                user.Pricing = req.Pricing ?? user.Pricing;
                user.PriceMin = req.PriceMin ?? user.PriceMin;
                user.PriceMax = req.PriceMax ?? user.PriceMax;
                user.Experience = req.Experience ?? user.Experience;

                if (req.Availability is not null)
                {
                    user.Availability = req.Availability.Select(a => new AvailabilitySlot
                    {
                        Date = a.Date,
                        TimeSlots = (a.TimeSlots ?? []).Select(t => new TimeSlot { StartTime = t.StartTime, EndTime = t.EndTime }).ToList()
                    }).ToList();
                }
            }

            await users.UpdateAsync(user, ct);
            return Results.Ok(UserDtoMapping.ToDto(user));
        });

        group.MapPost("/me/password", async (
            ClaimsPrincipal principal,
            ChangePasswordRequest req,
            IUserRepository users,
            IPasswordHasher hasher,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var user = await users.GetByIdAsync(userId, ct);
            if (user is null) return Results.NotFound(new { message = "User not found" });

            if (!hasher.Verify(req.CurrentPassword, user.PasswordHash))
                return Results.Json(new { message = "Current password is incorrect" }, statusCode: StatusCodes.Status400BadRequest);

            user.PasswordHash = hasher.Hash(req.NewPassword);
            await users.UpdateAsync(user, ct);
            return Results.Ok(new { message = "Password updated successfully" });
        });

        // ── Admin user management ─────────────────────────────────────────────
        var admin = app.MapGroup("/api/admin").WithTags("Admin").RequireAuthorization("AdminOnly");

        admin.MapGet("/users", async (IUserRepository users, CancellationToken ct) =>
        {
            var all = await users.GetAllAsync(ct);
            return Results.Ok(all.Select(UserDtoMapping.ToDto));
        });

        admin.MapPost("/users/{id}/toggle-suspend", async (string id, IUserRepository users, CancellationToken ct) =>
        {
            var user = await users.GetByIdAsync(id, ct);
            if (user is null) return Results.NotFound(new { message = "User not found" });

            if (user.RejectedAt is null)
            {
                user.RejectedAt = DateTimeOffset.UtcNow;
                user.RejectionReason = "Suspended by admin";
            }
            else
            {
                user.RejectedAt = null;
                user.RejectionReason = null;
            }

            await users.UpdateAsync(user, ct);
            return Results.Ok(UserDtoMapping.ToDto(user));
        });

        admin.MapPost("/users/{id}/suspend", async (string id, SuspendUserRequest req, IUserRepository users, CancellationToken ct) =>
        {
            var user = await users.GetByIdAsync(id, ct);
            if (user is null) return Results.NotFound(new { message = "User not found" });

            user.RejectedAt = DateTimeOffset.UtcNow;
            user.RejectionReason = string.IsNullOrWhiteSpace(req.Reason) ? "Suspended by admin" : req.Reason.Trim();
            await users.UpdateAsync(user, ct);
            return Results.Ok(UserDtoMapping.ToDto(user));
        });

        admin.MapPost("/users/{id}/unsuspend", async (string id, IUserRepository users, CancellationToken ct) =>
        {
            var user = await users.GetByIdAsync(id, ct);
            if (user is null) return Results.NotFound(new { message = "User not found" });

            user.RejectedAt = null;
            user.RejectionReason = null;
            await users.UpdateAsync(user, ct);
            return Results.Ok(UserDtoMapping.ToDto(user));
        });
    }
}

public sealed record SuspendUserRequest(string? Reason);
