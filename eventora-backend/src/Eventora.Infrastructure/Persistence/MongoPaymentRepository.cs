using Eventora.Application.Abstractions.Persistence;
using Eventora.Domain.Payments;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Eventora.Infrastructure.Persistence;

internal sealed class MongoPaymentRepository(MongoCollections collections) : IPaymentRepository
{
    private readonly IMongoCollection<Payment> _payments = collections.Payments;

    public async Task<Payment?> GetByIdAsync(string id, CancellationToken ct)
        => await _payments.Find(p => p.Id == id).FirstOrDefaultAsync(ct);

    public async Task<Payment?> GetByBookingIdAsync(string bookingId, CancellationToken ct)
        => await _payments.Find(p => p.BookingId == bookingId).FirstOrDefaultAsync(ct);

    public async Task<Payment?> GetByStripeSessionIdAsync(string sessionId, CancellationToken ct)
        => await _payments.Find(p => p.StripeSessionId == sessionId).FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<Payment>> GetForCustomerAsync(string customerId, CancellationToken ct)
        => await _payments.Find(p => p.CustomerId == customerId).SortByDescending(p => p.CreatedAt).ToListAsync(ct);

    public async Task CreateAsync(Payment payment, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(payment.Id))
            payment.Id = ObjectId.GenerateNewId().ToString();
        payment.CreatedAt = DateTimeOffset.UtcNow;
        payment.UpdatedAt = DateTimeOffset.UtcNow;
        await _payments.InsertOneAsync(payment, cancellationToken: ct);
    }

    public async Task UpdateAsync(Payment payment, CancellationToken ct)
    {
        payment.UpdatedAt = DateTimeOffset.UtcNow;
        await _payments.ReplaceOneAsync(p => p.Id == payment.Id, payment, cancellationToken: ct);
    }
}
