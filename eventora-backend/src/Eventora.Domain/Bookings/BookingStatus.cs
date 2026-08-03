namespace Eventora.Domain.Bookings;

public enum BookingStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2,
    Completed = 3,
    Cancelled = 4,
    CancellationPending = 5,
}
