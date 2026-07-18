using Eventora.Application.Abstractions.Persistence;
using Eventora.Domain.Reviews;
using MongoDB.Driver;

namespace Eventora.Infrastructure.Persistence;

/// <summary>
/// MongoDB implementation for reviews.
/// </summary>
internal sealed class MongoReviewRepository(MongoCollections collections) : IReviewRepository
{
    private readonly IMongoCollection<Review> _reviews = collections.Reviews;

    public async Task<Review?> GetByBookingIdAsync(string bookingId, CancellationToken ct)
    {
        return await _reviews.Find(r => r.BookingId == bookingId).FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<Review>> GetForVendorAsync(string vendorId, CancellationToken ct)
    {
        return await _reviews
            .Find(r => r.VendorId == vendorId)
            .SortByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Review>> GetRecentAsync(int limit, CancellationToken ct)
    {
        return await _reviews
            .Find(Builders<Review>.Filter.Empty)
            .SortByDescending(r => r.CreatedAt)
            .Limit(limit)
            .ToListAsync(ct);
    }

    public async Task CreateAsync(Review review, CancellationToken ct)
    {
        MongoId.EnsureId(review, r => r.Id, (r, v) => r.Id = v);
        review.CreatedAt = DateTimeOffset.UtcNow;
        await _reviews.InsertOneAsync(review, cancellationToken: ct);
    }

    public async Task DeleteAsync(string id, CancellationToken ct)
        => await _reviews.DeleteOneAsync(r => r.Id == id, ct);
}
