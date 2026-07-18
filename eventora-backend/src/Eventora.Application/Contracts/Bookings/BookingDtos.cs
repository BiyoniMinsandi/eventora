using System.ComponentModel.DataAnnotations;
using Eventora.Domain.Bookings;

namespace Eventora.Application.Contracts.Bookings;

public sealed record CreateBookingRequest(
    [property: Required] string VendorId,
    [property: Required, MinLength(2)] string Service,
    [property: Required, MinLength(8)] string EventDate,
    [property: Required, MinLength(2)] string EventType,
    int? GuestCount,
    string? Budget,
    string? SpecialRequests);

public sealed record BookingDto(
    string Id,
    string CustomerId,
    string CustomerName,
    string VendorId,
    string VendorName,
    string VendorBusinessName,
    string Service,
    string EventDate,
    string EventType,
    int? GuestCount,
    string? Budget,
    string? SpecialRequests,
    string Status,
    string? VendorResponseNote,
    string? PaymentId,
    string PaymentStatus,
    long? AmountInCents,
    string Currency,
    string CreatedAt,
    string UpdatedAt);

public sealed record BookingDecisionRequest(string? VendorResponseNote);

public static class BookingDtoMapping
{
    public static string ToApiStatus(BookingStatus status) => status switch
    {
        BookingStatus.Pending => "pending",
        BookingStatus.Accepted => "accepted",
        BookingStatus.Rejected => "rejected",
        BookingStatus.Completed => "completed",
        BookingStatus.Cancelled => "cancelled",
        _ => "pending",
    };

    public static BookingDto ToDto(Eventora.Domain.Bookings.Booking booking)
    {
        return new BookingDto(
            booking.Id,
            booking.CustomerId,
            booking.CustomerName,
            booking.VendorId,
            booking.VendorName,
            booking.VendorBusinessName,
            booking.Service,
            booking.EventDate,
            booking.EventType,
            booking.GuestCount,
            booking.Budget,
            booking.SpecialRequests,
            ToApiStatus(booking.Status),
            booking.VendorResponseNote,
            booking.PaymentId,
            booking.PaymentStatus,
            booking.AmountInCents,
            booking.Currency,
            booking.CreatedAt.ToString("O"),
            booking.UpdatedAt.ToString("O"));
    }
}
