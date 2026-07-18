using System.Security.Claims;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
#pragma warning disable CS0618

namespace Eventora.Api.Endpoints;

internal static class UploadEndpoints
{
    public static void MapUploadEndpoints(this WebApplication app)
    {
        // Image upload (JPEG, PNG, WebP)
        app.MapPost("/api/upload/image", async (
            IFormFile file,
            ClaimsPrincipal principal,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var cloudinary = GetCloudinary(config);
            if (cloudinary is null)
                return Results.Problem(detail: "Cloudinary is not configured.", statusCode: 503);

            if (file.Length == 0)
                return Results.BadRequest(new { message = "File is empty" });

            var maxMb = config.GetValue<int>("Cloudinary:MaxImageSizeMb", 10);
            if (file.Length > maxMb * 1024 * 1024)
                return Results.BadRequest(new { message = $"File exceeds the {maxMb} MB limit" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            if (!allowed.Contains(ext))
                return Results.BadRequest(new { message = "Only JPEG, PNG, and WebP files are allowed" });

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = $"eventora/vendors/{userId}/images",
                UseFilename = false,
                UniqueFilename = true,
                Overwrite = false,
            };

            var result = await cloudinary.UploadAsync(uploadParams, ct);
            if (result.Error is not null)
                return Results.Problem(detail: result.Error.Message, statusCode: 500);

            return Results.Ok(new { url = result.SecureUrl.ToString() });
        })
        .RequireAuthorization()
        .DisableAntiforgery()
        .WithTags("Upload");

        // Video upload (MP4, MOV, WebM)
        app.MapPost("/api/upload/video", async (
            IFormFile file,
            ClaimsPrincipal principal,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var cloudinary = GetCloudinary(config);
            if (cloudinary is null)
                return Results.Problem(detail: "Cloudinary is not configured.", statusCode: 503);

            if (file.Length == 0)
                return Results.BadRequest(new { message = "File is empty" });

            var maxMb = config.GetValue<int>("Cloudinary:MaxVideoSizeMb", 200);
            if (file.Length > maxMb * 1024 * 1024)
                return Results.BadRequest(new { message = $"Video exceeds the {maxMb} MB limit" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new[] { ".mp4", ".mov", ".webm", ".avi" };
            if (!allowed.Contains(ext))
                return Results.BadRequest(new { message = "Only MP4, MOV, WebM, and AVI files are allowed" });

            using var stream = file.OpenReadStream();
            var uploadParams = new VideoUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = $"eventora/vendors/{userId}/videos",
                UseFilename = false,
                UniqueFilename = true,
                Overwrite = false,
            };

            var result = await cloudinary.UploadAsync(uploadParams, ct);
            if (result.Error is not null)
                return Results.Problem(detail: result.Error.Message, statusCode: 500);

            return Results.Ok(new { url = result.SecureUrl.ToString() });
        })
        .RequireAuthorization()
        .DisableAntiforgery()
        .WithTags("Upload");

        // Document upload (PDF, DOC, DOCX)
        app.MapPost("/api/upload/document", async (
            IFormFile file,
            ClaimsPrincipal principal,
            IConfiguration config,
            CancellationToken ct) =>
        {
            var userId = CurrentUser.TryGetUserId(principal);
            if (string.IsNullOrWhiteSpace(userId)) return Results.Unauthorized();

            var cloudinary = GetCloudinary(config);
            if (cloudinary is null)
                return Results.Problem(detail: "Cloudinary is not configured.", statusCode: 503);

            if (file.Length == 0)
                return Results.BadRequest(new { message = "File is empty" });

            var maxMb = config.GetValue<int>("Cloudinary:MaxDocSizeMb", 10);
            if (file.Length > maxMb * 1024 * 1024)
                return Results.BadRequest(new { message = $"File exceeds the {maxMb} MB limit" });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowed = new[] { ".pdf", ".doc", ".docx", ".txt" };
            if (!allowed.Contains(ext))
                return Results.BadRequest(new { message = "Only PDF, DOC, DOCX, and TXT files are allowed" });

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = $"eventora/vendors/{userId}/documents",
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false,
            };

            var result = await cloudinary.UploadAsync(uploadParams, ct);
            if (result.Error is not null)
                return Results.Problem(detail: result.Error.Message, statusCode: 500);

            return Results.Ok(new { url = result.SecureUrl.ToString() });
        })
        .RequireAuthorization()
        .DisableAntiforgery()
        .WithTags("Upload");
    }

    private static Cloudinary? GetCloudinary(IConfiguration config)
    {
        var cloudName = config["Cloudinary:CloudName"];
        var apiKey    = config["Cloudinary:ApiKey"];
        var apiSecret = config["Cloudinary:ApiSecret"];

        if (string.IsNullOrWhiteSpace(cloudName) ||
            string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(apiSecret))
            return null;

        return new Cloudinary(new Account(cloudName, apiKey, apiSecret))
        {
            Api = { Secure = true }
        };
    }
}
