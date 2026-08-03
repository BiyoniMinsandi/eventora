using Eventora.Api.Endpoints;
using Eventora.Api.Hubs;
using Eventora.Api.Seed;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddOptions<Eventora.Api.Auth.JwtOptions>()
    .Bind(builder.Configuration.GetSection(Eventora.Api.Auth.JwtOptions.SectionName))
    .Validate(o => !string.IsNullOrWhiteSpace(o.SigningKey) && o.SigningKey.Length >= 32, "Jwt:SigningKey must be at least 32 chars")
    .ValidateOnStart();

// Core services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

// Infrastructure (MongoDB, persistence, etc.)
builder.Services.AddEventoraInfrastructure(builder.Configuration);

// AuthN/AuthZ
builder.Services.AddSingleton<Eventora.Api.Auth.JwtTokenService>();
builder.Services
    .AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        var jwt = builder.Configuration.GetSection(Eventora.Api.Auth.JwtOptions.SectionName).Get<Eventora.Api.Auth.JwtOptions>()
                  ?? new Eventora.Api.Auth.JwtOptions();

        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
        };

        // SignalR WebSocket connections send the token as a query param
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && ctx.Request.Path.StartsWithSegments("/hubs"))
                {
                    ctx.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", p => p.RequireRole("admin"));
    options.AddPolicy("VendorOnly", p => p.RequireRole("vendor"));
    options.AddPolicy("CustomerOnly", p => p.RequireRole("customer"));
});

// MongoDB seed data (development convenience)
builder.Services
    .AddOptions<MongoSeedOptions>()
    .Bind(builder.Configuration.GetSection(MongoSeedOptions.SectionName));

builder.Services.AddHostedService<MongoSeedHostedService>();

// CORS — read from CORS_ORIGIN env var (single), or Cors:AllowedOrigins array, or dev defaults
var corsOriginEnv = Environment.GetEnvironmentVariable("CORS_ORIGIN");
string[] allowedOrigins;
if (!string.IsNullOrWhiteSpace(corsOriginEnv))
{
    allowedOrigins = corsOriginEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
else
{
    allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:3000", "http://localhost:3001"];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", p =>
        p.WithOrigins(allowedOrigins)
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials());
});

// Rate limiting — protect auth endpoints from brute-force attacks
builder.Services.AddRateLimiter(opts =>
{
    opts.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 10;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });

    opts.AddFixedWindowLimiter("api", o =>
    {
        o.PermitLimit = 300;
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 5;
    });

    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Health checks
builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Basic endpoints
app.MapGet("/", () => Results.Ok(new { name = "Eventora API", version = "1.0", status = "ok" }))
    .WithName("Root");

app.MapHealthChecks("/health");

// --- Auth endpoints
var authGroup = app.MapGroup("/api/auth").WithTags("Auth").RequireRateLimiting("auth");

authGroup.MapPost("/register", async (
        Eventora.Application.Contracts.Auth.RegisterRequest req,
        Eventora.Application.Abstractions.Persistence.IUserRepository users,
        Eventora.Application.Abstractions.Security.IPasswordHasher hasher,
        Eventora.Api.Auth.JwtTokenService tokens,
        CancellationToken ct) =>
    {
        if (!Eventora.Application.Contracts.Auth.UserRoleParsing.TryParse(req.Role, out var role))
        {
            return Results.BadRequest(new { message = "Invalid role" });
        }

        if (role == Eventora.Domain.Users.UserRole.Admin)
        {
            return Results.BadRequest(new { message = "Admin registration is not allowed" });
        }

        var existing = await users.GetByEmailAsync(req.Email, ct);
        if (existing is not null)
        {
            return Results.Conflict(new { message = "Email already registered" });
        }

        var user = new Eventora.Domain.Users.User
        {
            Email = req.Email.Trim().ToLowerInvariant(),
            FullName = req.FullName.Trim(),
            Role = role,
            PasswordHash = hasher.Hash(req.Password),
            Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
            BusinessName = string.IsNullOrWhiteSpace(req.BusinessName) ? null : req.BusinessName.Trim(),
            Category = string.IsNullOrWhiteSpace(req.Category) ? null : req.Category.Trim(),
            Location = string.IsNullOrWhiteSpace(req.Location) ? null : req.Location.Trim(),
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            Services = req.Services ?? [],
            Pricing = string.IsNullOrWhiteSpace(req.Pricing) ? null : req.Pricing.Trim(),
            Experience = string.IsNullOrWhiteSpace(req.Experience) ? null : req.Experience.Trim(),
            Approved = role != Eventora.Domain.Users.UserRole.Vendor,
            ApprovedAt = role != Eventora.Domain.Users.UserRole.Vendor ? DateTimeOffset.UtcNow : null,
        };

        await users.CreateAsync(user, ct);

        if (user.Role == Eventora.Domain.Users.UserRole.Vendor && !user.Approved)
        {
            return Results.Ok(new
            {
                token = string.Empty,
                user = new { id = user.Id, email = user.Email, fullName = user.FullName, role = "vendor", approved = user.Approved, createdAt = user.CreatedAt.ToString("O") },
                message = "Vendor registration submitted. Pending admin approval."
            });
        }

        var token = tokens.CreateToken(user);
        return Results.Ok(new Eventora.Application.Contracts.Auth.AuthResponse(
            token,
            Eventora.Application.Contracts.Users.UserDtoMapping.ToDto(user)
        ));
    })
    .WithName("Register");

authGroup.MapPost("/login", async (
        Eventora.Application.Contracts.Auth.LoginRequest req,
        Eventora.Application.Abstractions.Persistence.IUserRepository users,
        Eventora.Application.Abstractions.Security.IPasswordHasher hasher,
        Eventora.Api.Auth.JwtTokenService tokens,
        CancellationToken ct) =>
    {
        var user = await users.GetByEmailAsync(req.Email, ct);
        if (user is null)
        {
            return Results.Json(new { message = "Invalid email or password" }, statusCode: StatusCodes.Status401Unauthorized);
        }

        if (user.RejectedAt is not null)
        {
            var reason = string.IsNullOrWhiteSpace(user.RejectionReason) ? "No reason provided" : user.RejectionReason;
            return Results.Json(new { message = $"REJECTED:{reason}", status = "rejected", reason }, statusCode: StatusCodes.Status401Unauthorized);
        }

        if (!hasher.Verify(req.Password, user.PasswordHash))
        {
            return Results.Json(new { message = "Invalid email or password" }, statusCode: StatusCodes.Status401Unauthorized);
        }

        if (user.Role == Eventora.Domain.Users.UserRole.Vendor && !user.Approved)
        {
            return Results.Json(new { message = "Your vendor account is pending admin approval" }, statusCode: StatusCodes.Status401Unauthorized);
        }

        var token = tokens.CreateToken(user);
        return Results.Ok(new Eventora.Application.Contracts.Auth.AuthResponse(
            token,
            Eventora.Application.Contracts.Users.UserDtoMapping.ToDto(user)
        ));
    })
    .WithName("Login");

// --- SignalR hub
app.MapHub<ChatHub>("/hubs/chat");

// --- Public platform statistics
app.MapGet("/api/stats", async (
    Eventora.Application.Abstractions.Persistence.IUserRepository users,
    Eventora.Application.Abstractions.Persistence.IBookingRepository bookings,
    Eventora.Application.Abstractions.Persistence.IReviewRepository reviews,
    CancellationToken ct) =>
{
    var allUsers    = await users.GetAllAsync(ct);
    var allBookings = await bookings.GetAllAsync(ct);
    var allReviews  = await reviews.GetRecentAsync(1000, ct);

    var customerCount       = allUsers.Count(u => u.Role == Eventora.Domain.Users.UserRole.Customer);
    var approvedVendorCount = allUsers.Count(u => u.Role == Eventora.Domain.Users.UserRole.Vendor && u.Approved);
    var completedBookings   = allBookings.Count(b => b.Status == Eventora.Domain.Bookings.BookingStatus.Completed);
    var totalBookings       = allBookings.Count;
    var reviewCount         = allReviews.Count;
    var avgRating           = reviewCount == 0 ? 0.0 : Math.Round(allReviews.Average(r => (double)r.Rating), 1);

    return Results.Ok(new
    {
        customers        = customerCount,
        approvedVendors  = approvedVendorCount,
        totalBookings    = totalBookings,
        completedBookings= completedBookings,
        reviews          = reviewCount,
        averageRating    = avgRating,
    });
}).WithTags("Public");

// --- Feature endpoints
app.MapUploadEndpoints();
app.MapUserEndpoints();
app.MapVendorEndpoints();
app.MapBookingEndpoints();
app.MapMessagingEndpoints();
app.MapReviewsEndpoints();
app.MapDisputesEndpoints();
app.MapNotificationsEndpoints();
app.MapPaymentEndpoints();
app.MapAdminSettingsEndpoints();

app.Run();
