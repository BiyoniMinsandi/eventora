using Eventora.Domain.Settings;

namespace Eventora.Application.Abstractions.Persistence;

public interface IPlatformSettingsRepository
{
    Task<PlatformSettings> GetAsync(CancellationToken ct = default);
    Task UpsertAsync(PlatformSettings settings, CancellationToken ct = default);
}
