using Eventora.Domain.Common;

namespace Eventora.Domain.Users;

/// <summary>
/// Represents any platform user. Customers and vendors share this entity;
/// vendor-specific fields are populated only when Role == Vendor.
/// Admins are created via the seed process — they cannot self-register.
/// </summary>
public sealed class User : EntityBase
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? Phone { get; set; }

    // ── Vendor-only fields ────────────────────────────────────────────────────

    public string? BusinessName { get; set; }

    /// <summary>
    /// A vendor may belong to exactly one primary category (SRS §5.5).
    /// </summary>
    public string? Category { get; set; }

    public string? Location { get; set; }
    public string? Description { get; set; }

    /// <summary>Photo URLs shown in the vendor's portfolio gallery.</summary>
    public List<string> Photos { get; set; } = [];

    /// <summary>Video URLs shown in the vendor's portfolio gallery.</summary>
    public List<string> Videos { get; set; } = [];

    public List<string> Services { get; set; } = [];

    /// <summary>Human-readable pricing description, e.g. "Rs. 25,000 – 80,000".</summary>
    public string? Pricing { get; set; }

    /// <summary>
    /// Numeric lower bound used for server-side price range filtering.
    /// Stored separately from Pricing so the API can compare integers.
    /// </summary>
    public int? PriceMin { get; set; }

    /// <summary>Numeric upper bound for price range filtering.</summary>
    public int? PriceMax { get; set; }

    public string? Experience { get; set; }

    // ── Approval state ────────────────────────────────────────────────────────

    /// <summary>
    /// Vendors start as unapproved and cannot log in until an admin approves them (SRS §5.5).
    /// Customers are auto-approved at registration.
    /// </summary>
    public bool Approved { get; set; }

    public DateTimeOffset? ApprovedAt { get; set; }

    /// <summary>
    /// Set when a vendor is rejected or suspended.
    /// Reused for account suspension so we don't need a separate flag.
    /// </summary>
    public DateTimeOffset? RejectedAt { get; set; }

    public string? RejectionReason { get; set; }

    public List<AvailabilitySlot> Availability { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
