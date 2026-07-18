using Eventora.Domain.Bookings;
using Eventora.Domain.Disputes;
using Eventora.Domain.Messaging;
using Eventora.Domain.Notifications;
using Eventora.Domain.Payments;
using Eventora.Domain.Reviews;
using Eventora.Domain.Settings;
using Eventora.Domain.Users;
using Eventora.Infrastructure.Mongo;
using MongoDB.Driver;

namespace Eventora.Infrastructure.Persistence;

/// <summary>
/// Provides typed MongoDB collections for all domain entities.
/// </summary>
internal sealed class MongoCollections(IMongoDatabaseFactory dbFactory)
{
    private readonly IMongoDatabase _db = dbFactory.GetDatabase();

    public IMongoCollection<User> Users => _db.GetCollection<User>("users");
    public IMongoCollection<Booking> Bookings => _db.GetCollection<Booking>("bookings");
    public IMongoCollection<Conversation> Conversations => _db.GetCollection<Conversation>("conversations");
    public IMongoCollection<BookingMessage> Messages => _db.GetCollection<BookingMessage>("messages");
    public IMongoCollection<Review> Reviews => _db.GetCollection<Review>("reviews");
    public IMongoCollection<Dispute> Disputes => _db.GetCollection<Dispute>("disputes");
    public IMongoCollection<DisputeMessage> DisputeMessages => _db.GetCollection<DisputeMessage>("dispute_messages");
    public IMongoCollection<Notification> Notifications => _db.GetCollection<Notification>("notifications");
    public IMongoCollection<Payment> Payments => _db.GetCollection<Payment>("payments");
    public IMongoCollection<PlatformSettings> PlatformSettings => _db.GetCollection<PlatformSettings>("platform_settings");
    public IMongoCollection<Category> Categories => _db.GetCollection<Category>("categories");
}
