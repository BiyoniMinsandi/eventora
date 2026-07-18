using Eventora.Domain.Common;

namespace Eventora.Domain.Payments;

/// <summary>
/// Represents a payment transaction for a booking.
/// Linked 1:1 with a Booking once a Stripe checkout session is created.
/// </summary>
public sealed class Payment : EntityBase
{
    public string BookingId { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string VendorId { get; set; } = string.Empty;

    /// <summary>Amount in the smallest currency unit (e.g., cents for USD, paise for LKR).</summary>
    public long AmountInCents { get; set; }

    /// <summary>ISO 4217 currency code, e.g. "usd", "lkr".</summary>
    public string Currency { get; set; } = "usd";

    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public string? StripeSessionId { get; set; }
    public string? StripePaymentIntentId { get; set; }

    /// <summary>Human-readable description shown on Stripe checkout.</summary>
    public string Description { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
