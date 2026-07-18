using Eventora.Application.Abstractions.Persistence;
using Eventora.Domain.Settings;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Eventora.Infrastructure.Persistence;

internal sealed class MongoCategoryRepository(MongoCollections collections) : ICategoryRepository
{
    private readonly IMongoCollection<Category> _col = collections.Categories;

    public async Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken ct)
        => await _col.Find(_ => true).SortBy(c => c.Name).ToListAsync(ct);

    public async Task<IReadOnlyList<Category>> GetActiveAsync(CancellationToken ct)
        => await _col.Find(c => c.Active).SortBy(c => c.Name).ToListAsync(ct);

    public async Task<Category?> GetBySlugAsync(string slug, CancellationToken ct)
        => await _col.Find(c => c.Slug == slug).FirstOrDefaultAsync(ct);

    public async Task<Category?> GetByIdAsync(string id, CancellationToken ct)
        => await _col.Find(c => c.Id == id).FirstOrDefaultAsync(ct);

    public async Task CreateAsync(Category category, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(category.Id))
            category.Id = ObjectId.GenerateNewId().ToString();
        category.CreatedAt = DateTimeOffset.UtcNow;
        await _col.InsertOneAsync(category, cancellationToken: ct);
    }

    public async Task UpdateAsync(Category category, CancellationToken ct)
        => await _col.ReplaceOneAsync(c => c.Id == category.Id, category, cancellationToken: ct);

    public async Task DeleteAsync(string id, CancellationToken ct)
        => await _col.DeleteOneAsync(c => c.Id == id, ct);
}
