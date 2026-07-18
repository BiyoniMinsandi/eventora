using Eventora.Application.Abstractions.Email;
using Eventora.Application.Abstractions.Persistence;
using Eventora.Domain.Settings;

namespace Eventora.Api.Endpoints;

/// <summary>
/// Platform settings, category management, content pages, FAQs, and API-key management for admins.
/// </summary>
internal static class AdminSettingsEndpoints
{
    public static void MapAdminSettingsEndpoints(this WebApplication app)
    {
        var admin = app.MapGroup("/api/admin").WithTags("Admin").RequireAuthorization("AdminOnly");

        // ── Platform Settings ────────────────────────────────────────────────

        admin.MapGet("/settings", async (IPlatformSettingsRepository settings, CancellationToken ct) =>
        {
            var s = await settings.GetAsync(ct);
            return Results.Ok(ToDto(s));
        });

        admin.MapPut("/settings", async (UpdateSettingsRequest req, IPlatformSettingsRepository settings, CancellationToken ct) =>
        {
            var s = await settings.GetAsync(ct);

            if (req.PlatformName is not null) s.PlatformName = req.PlatformName.Trim();
            if (req.PlatformUrl is not null) s.PlatformUrl = req.PlatformUrl.Trim();
            if (req.SupportEmail is not null) s.SupportEmail = req.SupportEmail.Trim();
            if (req.CommissionRate.HasValue) s.CommissionRate = req.CommissionRate.Value;
            if (req.MaintenanceEnabled.HasValue) s.MaintenanceEnabled = req.MaintenanceEnabled.Value;
            if (req.MaintenanceMessage is not null) s.MaintenanceMessage = req.MaintenanceMessage.Trim();
            if (req.SmtpHost is not null) s.SmtpHost = req.SmtpHost.Trim();
            if (req.SmtpPort.HasValue) s.SmtpPort = req.SmtpPort.Value;
            if (req.SmtpEmail is not null) s.SmtpEmail = req.SmtpEmail.Trim();
            if (req.SmtpPassword is not null) s.SmtpPassword = req.SmtpPassword;
            if (req.EmailEnabled.HasValue) s.EmailEnabled = req.EmailEnabled.Value;
            if (req.TwoFactorEnabled.HasValue) s.TwoFactorEnabled = req.TwoFactorEnabled.Value;

            await settings.UpsertAsync(s, ct);
            return Results.Ok(ToDto(s));
        });

        admin.MapPost("/settings/test-email", async (IPlatformSettingsRepository settings, IEmailService email, CancellationToken ct) =>
        {
            var s = await settings.GetAsync(ct);
            try
            {
                await email.SendAsync(
                    s.SupportEmail,
                    "Eventora Admin",
                    "Eventora — Test Email",
                    "<p>This is a test email from Eventora. Your email configuration is working correctly.</p>",
                    ct);
                return Results.Ok(new { success = true, message = "Test email sent successfully" });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { success = false, message = ex.Message });
            }
        });

        // ── Categories ──────────────────────────────────────────────────────

        // Public endpoint so homepage/vendor pages can list them
        app.MapGet("/api/categories", async (ICategoryRepository cats, CancellationToken ct) =>
        {
            var list = await cats.GetActiveAsync(ct);
            return Results.Ok(list.Select(c => new { id = c.Id, name = c.Name, slug = c.Slug, active = c.Active }));
        }).WithTags("Public");

        admin.MapGet("/content/categories", async (ICategoryRepository cats, IUserRepository users, CancellationToken ct) =>
        {
            var list = await cats.GetAllAsync(ct);
            var all = await users.FindVendorsAsync(approvedOnly: true, ct);
            return Results.Ok(list.Select(c => new
            {
                id = c.Id,
                name = c.Name,
                slug = c.Slug,
                active = c.Active,
                vendors = all.Count(u => (u.Category ?? "").Trim().ToLowerInvariant() == c.Slug),
            }));
        });

        admin.MapPost("/content/categories", async (CreateCategoryRequest req, ICategoryRepository cats, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { message = "Category name is required" });

            var slug = req.Slug?.Trim().ToLowerInvariant()
                       ?? req.Name.Trim().ToLowerInvariant().Replace(" ", "-");

            var existing = await cats.GetBySlugAsync(slug, ct);
            if (existing is not null)
                return Results.Conflict(new { message = "A category with this slug already exists" });

            var cat = new Category { Name = req.Name.Trim(), Slug = slug, Active = req.Active ?? true };
            await cats.CreateAsync(cat, ct);
            return Results.Ok(new { id = cat.Id, name = cat.Name, slug = cat.Slug, active = cat.Active });
        });

        admin.MapPut("/content/categories/{id}", async (string id, UpdateCategoryRequest req, ICategoryRepository cats, CancellationToken ct) =>
        {
            var cat = await cats.GetByIdAsync(id, ct);
            if (cat is null) return Results.NotFound(new { message = "Category not found" });

            if (req.Name is not null) cat.Name = req.Name.Trim();
            if (req.Active.HasValue) cat.Active = req.Active.Value;
            await cats.UpdateAsync(cat, ct);
            return Results.Ok(new { id = cat.Id, name = cat.Name, slug = cat.Slug, active = cat.Active });
        });

        admin.MapDelete("/content/categories/{id}", async (string id, ICategoryRepository cats, CancellationToken ct) =>
        {
            var cat = await cats.GetByIdAsync(id, ct);
            if (cat is null) return Results.NotFound(new { message = "Category not found" });
            await cats.DeleteAsync(id, ct);
            return Results.Ok(new { success = true });
        });

        // ── Content Pages (static stubs — real content managed via slug) ────

        admin.MapGet("/content/pages", (IConfiguration config) =>
        {
            var frontendUrl = config["App:FrontendUrl"] ?? "http://localhost:3000";
            return Results.Ok(new[]
            {
                new { id = "about",   title = "About Us",       slug = "about",   status = "published", views = 0, lastUpdated = DateTimeOffset.UtcNow.ToString("O") },
                new { id = "faq",     title = "FAQ",            slug = "faq",     status = "published", views = 0, lastUpdated = DateTimeOffset.UtcNow.ToString("O") },
                new { id = "terms",   title = "Terms of Service", slug = "terms", status = "published", views = 0, lastUpdated = DateTimeOffset.UtcNow.ToString("O") },
                new { id = "privacy", title = "Privacy Policy", slug = "privacy", status = "published", views = 0, lastUpdated = DateTimeOffset.UtcNow.ToString("O") },
                new { id = "contact", title = "Contact",        slug = "contact", status = "published", views = 0, lastUpdated = DateTimeOffset.UtcNow.ToString("O") },
            });
        });

        // ── FAQs ─────────────────────────────────────────────────────────────

        admin.MapGet("/content/faqs", () =>
        {
            return Results.Ok(new[]
            {
                new { id = "faq1", question = "How do I book a vendor?", answer = "Browse vendors, click on one, and use the 'Book Now' button.", category = "booking", status = "published", views = 0 },
                new { id = "faq2", question = "Can I cancel a booking?", answer = "You can cancel a booking up to 2 days before the event.", category = "booking", status = "published", views = 0 },
                new { id = "faq3", question = "How are vendors verified?", answer = "All vendors are reviewed by our team before approval.", category = "vendors", status = "published", views = 0 },
                new { id = "faq4", question = "What payment methods are accepted?", answer = "We accept all major credit and debit cards via Stripe.", category = "payment", status = "published", views = 0 },
                new { id = "faq5", question = "How do I raise a dispute?", answer = "Go to your booking and click 'Raise Dispute' if you have an issue.", category = "disputes", status = "published", views = 0 },
            });
        });

        // ── API Keys ─────────────────────────────────────────────────────────

        admin.MapGet("/api-keys", (IConfiguration config) =>
        {
            return Results.Ok(new[]
            {
                new
                {
                    id = "key1",
                    key = $"evnt_{System.Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("api_key_1")).Substring(0, 24)}",
                    createdAt = DateTimeOffset.UtcNow.AddDays(-30).ToString("O"),
                    status = "active"
                }
            });
        });

        admin.MapPost("/api-keys", () =>
        {
            var key = $"evnt_{System.Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)).Replace("+", "").Replace("/", "").Replace("=", "").Substring(0, 32)}";
            return Results.Ok(new { id = System.Guid.NewGuid().ToString(), key, createdAt = DateTimeOffset.UtcNow.ToString("O"), status = "active" });
        });

        admin.MapPost("/api-keys/{id}/revoke", (string id) =>
        {
            return Results.Ok(new { success = true });
        });
    }

    private static object ToDto(PlatformSettings s) => new
    {
        platformName = s.PlatformName,
        platformUrl = s.PlatformUrl,
        supportEmail = s.SupportEmail,
        commissionRate = s.CommissionRate.ToString(),
        maintenanceEnabled = s.MaintenanceEnabled,
        maintenanceMessage = s.MaintenanceMessage,
        smtpHost = s.SmtpHost,
        smtpPort = s.SmtpPort.ToString(),
        smtpEmail = s.SmtpEmail,
        twoFactorEnabled = s.TwoFactorEnabled,
        emailEnabled = s.EmailEnabled,
    };
}

public sealed record UpdateSettingsRequest(
    string? PlatformName,
    string? PlatformUrl,
    string? SupportEmail,
    decimal? CommissionRate,
    bool? MaintenanceEnabled,
    string? MaintenanceMessage,
    string? SmtpHost,
    int? SmtpPort,
    string? SmtpEmail,
    string? SmtpPassword,
    bool? EmailEnabled,
    bool? TwoFactorEnabled);

public sealed record CreateCategoryRequest(string Name, string? Slug, bool? Active);
public sealed record UpdateCategoryRequest(string? Name, bool? Active);
