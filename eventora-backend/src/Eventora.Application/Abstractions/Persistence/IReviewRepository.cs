using Eventora.Domain.Reviews;

namespace Eventora.Application.Abstractions.Persistence;

/// <summary>
/// Review persistence operations.
/// </summary>
public interface IReviewRepository
{
    Task<Review?> GetByBookingIdAsync(string bookingId, CancellationToken ct);
    Task<IReadOnlyList<Review>> GetForVendorAsync(string vendorId, CancellationToken ct);
    Task<IReadOnlyList<Review>> GetRecentAsync(int limit, CancellationToken ct);
    Task CreateAsync(Review review, CancellationToken ct);
    Task DeleteAsync(string id, CancellationToken ct);
}
