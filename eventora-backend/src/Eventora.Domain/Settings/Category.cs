using Eventora.Domain.Common;

namespace Eventora.Domain.Settings;

/// <summary>Vendor service category managed by admins.</summary>
public sealed class Category : EntityBase
{
    public string Name { get; set; } = string.Empty;

    /// <summary>URL-safe slug, e.g. "photography".</summary>
    public string Slug { get; set; } = string.Empty;

    public bool Active { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
