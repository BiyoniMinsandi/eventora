using Eventora.Domain.Users;

namespace Eventora.Application.Contracts.Users;

public sealed record TimeSlotDto(string StartTime, string EndTime);

public sealed record AvailabilitySlotDto(string Date, List<TimeSlotDto> TimeSlots);

/// <summary>
/// User DTO aligned to the frontend User interface (lib/auth.ts).
/// </summary>
public sealed record UserDto(
    string Id,
    string Email,
    string FullName,
    string Role,
    string? Phone,
    string? BusinessName,
    string? Category,
    string? Location,
    string? Description,
    List<string>? Photos,
    List<string>? Videos,
    List<string>? Services,
    string? Pricing,
    int? PriceMin,
    int? PriceMax,
    string? Experience,
    bool? Approved,
    string CreatedAt,
    string? RejectionReason,
    string? RejectedAt,
    string? ApprovedAt,
    List<AvailabilitySlotDto>? Availability,
    List<string>? BlockedDates);

public static class UserDtoMapping
{
    public static string ToApiRole(UserRole role) => role switch
    {
        UserRole.Customer => "customer",
        UserRole.Vendor => "vendor",
        UserRole.Admin => "admin",
        _ => "customer",
    };

    public static UserDto ToDto(Eventora.Domain.Users.User user)
    {
        return new UserDto(
            user.Id,
            user.Email,
            user.FullName,
            ToApiRole(user.Role),
            user.Phone,
            user.BusinessName,
            user.Category,
            user.Location,
            user.Description,
            user.Photos,
            user.Videos,
            user.Services,
            user.Pricing,
            user.PriceMin,
            user.PriceMax,
            user.Experience,
            user.Role == UserRole.Vendor ? user.Approved : null,
            user.CreatedAt.ToString("O"),
            user.RejectionReason,
            user.RejectedAt?.ToString("O"),
            user.ApprovedAt?.ToString("O"),
            user.Availability?.Select(a => new AvailabilitySlotDto(
                a.Date,
                (a.TimeSlots ?? []).Select(t => new TimeSlotDto(t.StartTime, t.EndTime)).ToList()
            )).ToList(),
            user.BlockedDates.Count > 0 ? user.BlockedDates : null);
    }
}
