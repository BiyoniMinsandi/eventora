using Eventora.Domain.Payments;

namespace Eventora.Application.Abstractions.Persistence;

public interface IPaymentRepository
{
    Task<Payment?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Payment?> GetByBookingIdAsync(string bookingId, CancellationToken ct = default);
    Task<Payment?> GetByStripeSessionIdAsync(string sessionId, CancellationToken ct = default);
    Task<IReadOnlyList<Payment>> GetForCustomerAsync(string customerId, CancellationToken ct = default);
    Task CreateAsync(Payment payment, CancellationToken ct = default);
    Task UpdateAsync(Payment payment, CancellationToken ct = default);
}
