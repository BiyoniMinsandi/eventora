using System.ComponentModel.DataAnnotations;
using Eventora.Application.Contracts.Users;
using Eventora.Domain.Users;

namespace Eventora.Application.Contracts.Auth;

public sealed record RegisterRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required, MinLength(6)] string Password,
    [property: Required, MinLength(2)] string FullName,
    [property: Required] string Role,
    string? Phone,
    string? BusinessName,
    string? Category,
    string? Location,
    string? Description,
    List<string>? Services,
    string? Pricing,
    string? Experience);

public sealed record LoginRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required] string Password);

public sealed record AuthUserDto(
    string Id,
    string Email,
    string FullName,
    string Role,
    bool? Approved,
    string CreatedAt);

public sealed record AuthResponse(string Token, UserDto User);

public static class UserRoleParsing
{
    public static bool TryParse(string value, out UserRole role)
    {
        role = UserRole.Customer;
        if (string.IsNullOrWhiteSpace(value)) return false;

        return value.Trim().ToLowerInvariant() switch
        {
            "customer" => (role = UserRole.Customer) == UserRole.Customer,
            "vendor" => (role = UserRole.Vendor) == UserRole.Vendor,
            "admin" => (role = UserRole.Admin) == UserRole.Admin,
            _ => false,
        };
    }

    public static string ToApiString(UserRole role) => role switch
    {
        UserRole.Customer => "customer",
        UserRole.Vendor => "vendor",
        UserRole.Admin => "admin",
        _ => "customer",
    };
}
