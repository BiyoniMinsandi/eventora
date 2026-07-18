using Eventora.Application.Abstractions.Persistence;
using Eventora.Domain.Settings;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Eventora.Infrastructure.Persistence;

internal sealed class MongoPlatformSettingsRepository(MongoCollections collections) : IPlatformSettingsRepository
{
    private const string FixedId = "platform_settings";
    private readonly IMongoCollection<PlatformSettings> _col = collections.PlatformSettings;

    public async Task<PlatformSettings> GetAsync(CancellationToken ct)
    {
        var doc = await _col.Find(s => s.Id == FixedId).FirstOrDefaultAsync(ct);
        if (doc is not null) return doc;

        var defaults = new PlatformSettings { Id = FixedId };
        await _col.InsertOneAsync(defaults, cancellationToken: ct);
        return defaults;
    }

    public async Task UpsertAsync(PlatformSettings settings, CancellationToken ct)
    {
        settings.Id = FixedId;
        settings.UpdatedAt = DateTimeOffset.UtcNow;
        await _col.ReplaceOneAsync(
            s => s.Id == FixedId,
            settings,
            new ReplaceOptions { IsUpsert = true },
            ct);
    }
}
