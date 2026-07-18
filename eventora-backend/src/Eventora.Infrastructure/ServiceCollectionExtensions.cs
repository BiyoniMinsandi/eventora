using Eventora.Infrastructure.Configuration;
using Eventora.Infrastructure.Email;
using Eventora.Infrastructure.Mongo;
using Eventora.Infrastructure.Persistence;
using Eventora.Infrastructure.Security;
using Eventora.Application.Abstractions.Email;
using Eventora.Application.Abstractions.Persistence;
using Eventora.Application.Abstractions.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;
using MongoDB.Bson;

namespace Microsoft.Extensions.DependencyInjection;

public static class ServiceCollectionExtensions
{
    /// <summary>
/// Registers all infrastructure services: MongoDB, repositories, and the password hasher.
/// </summary>
public static IServiceCollection AddEventoraInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Map the domain "Id" property to MongoDB's "_id" field without coupling
        // the domain layer to any MongoDB attributes.
        try
        {
            var pack = new ConventionPack
            {
                new NamedIdMemberConvention("Id"),
                new IgnoreExtraElementsConvention(true),
            };

            ConventionRegistry.Register(
                "EventoraConventions",
                pack,
                t => t.Namespace is not null && t.Namespace.StartsWith("Eventora.Domain", StringComparison.Ordinal));
        }
        catch (ArgumentException)
        {
            // Convention pack already registered.
        }

        services
            .AddOptions<MongoOptions>()
            .Bind(configuration.GetSection(MongoOptions.SectionName))
            .Validate(o => !string.IsNullOrWhiteSpace(o.ConnectionString), "Mongo:ConnectionString is required")
            .Validate(o => !string.IsNullOrWhiteSpace(o.Database), "Mongo:Database is required")
            .ValidateOnStart();

        services.AddSingleton<IMongoClient>(sp =>
        {
            var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<MongoOptions>>().Value;
            return new MongoClient(options.ConnectionString);
        });

        services.AddSingleton<IMongoDatabaseFactory, MongoDatabaseFactory>();

        // Mongo collection wrapper
        services.AddSingleton<MongoCollections>();

        // Security
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();

        // Email
        services.AddSingleton<IEmailService, SmtpEmailService>();

        // Repositories
        services.AddSingleton<IUserRepository, MongoUserRepository>();
        services.AddSingleton<IBookingRepository, MongoBookingRepository>();
        services.AddSingleton<IConversationRepository, MongoConversationRepository>();
        services.AddSingleton<IMessageRepository, MongoMessageRepository>();
        services.AddSingleton<IReviewRepository, MongoReviewRepository>();
        services.AddSingleton<IDisputeRepository, MongoDisputeRepository>();
        services.AddSingleton<IDisputeMessageRepository, MongoDisputeMessageRepository>();
        services.AddSingleton<INotificationRepository, MongoNotificationRepository>();
        services.AddSingleton<IPaymentRepository, MongoPaymentRepository>();
        services.AddSingleton<IPlatformSettingsRepository, MongoPlatformSettingsRepository>();
        services.AddSingleton<ICategoryRepository, MongoCategoryRepository>();

        return services;
    }
}
