using Eventora.Domain.Common;

namespace Eventora.Domain.Bookings;

/// <summary>
/// Booking request and confirmation workflow record.
/// </summary>
public sealed class Booking : EntityBase
{
    public string CustomerId { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string VendorId { get; set; } = string.Empty;

    public string VendorName { get; set; } = string.Empty;

    public string VendorBusinessName { get; set; } = string.Empty;

    public string Service { get; set; } = string.Empty;

    /// <summary>
    /// ISO date string.
    /// </summary>
    public string EventDate { get; set; } = string.Empty;

    public string EventType { get; set; } = string.Empty;

    public int? GuestCount { get; set; }

    public string? Budget { get; set; }

    public string? SpecialRequests { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.Pending;

    public string? VendorResponseNote { get; set; }

    // ── Payment fields ────────────────────────────────────────────────────────

    /// <summary>ID of the linked Payment document, populated when checkout is initiated.</summary>
    public string? PaymentId { get; set; }

    /// <summary>Payment status mirrored here for quick reads without a second collection lookup.</summary>
    public string PaymentStatus { get; set; } = "unpaid";

    /// <summary>Amount agreed at booking time (from Budget field, converted by admin).</summary>
    public long? AmountInCents { get; set; }

    public string Currency { get; set; } = "usd";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
