namespace Eventora.Application.Contracts.Users;

/// <summary>
/// Update payload for the currently authenticated user.
/// </summary>
public sealed record UpdateMeRequest(
    string? FullName,
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
    List<AvailabilitySlotDto>? Availability);
