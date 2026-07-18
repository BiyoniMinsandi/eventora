using Eventora.Domain.Common;

namespace Eventora.Domain.Settings;

/// <summary>
/// Singleton platform configuration stored in MongoDB.
/// Only one document exists; its Id is fixed to "platform_settings".
/// </summary>
public sealed class PlatformSettings : EntityBase
{
    public string PlatformName { get; set; } = "Eventora";
    public string PlatformUrl { get; set; } = "https://eventora.com";
    public string SupportEmail { get; set; } = "support@eventora.com";
    public decimal CommissionRate { get; set; } = 10m;
    public bool MaintenanceEnabled { get; set; } = false;
    public string MaintenanceMessage { get; set; } = "We are down for scheduled maintenance. We'll be back shortly.";

    public string SmtpHost { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;
    public string SmtpEmail { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public bool EmailEnabled { get; set; } = false;

    public bool TwoFactorEnabled { get; set; } = false;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
