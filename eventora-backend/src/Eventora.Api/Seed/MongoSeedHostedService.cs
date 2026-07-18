using Eventora.Application.Abstractions.Security;
using Eventora.Domain.Bookings;
using Eventora.Domain.Messaging;
using Eventora.Domain.Notifications;
using Eventora.Domain.Reviews;
using Eventora.Domain.Settings;
using Eventora.Domain.Users;
using Eventora.Infrastructure.Mongo;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Eventora.Api.Seed;

public sealed class MongoSeedHostedService : IHostedService
{
    private readonly IMongoDatabaseFactory _dbFactory;
    private readonly IPasswordHasher _hasher;
    private readonly IOptions<MongoSeedOptions> _options;
    private readonly ILogger<MongoSeedHostedService> _logger;

    public MongoSeedHostedService(
        IMongoDatabaseFactory dbFactory,
        IPasswordHasher hasher,
        IOptions<MongoSeedOptions> options,
        ILogger<MongoSeedHostedService> logger)
    {
        _dbFactory = dbFactory;
        _hasher = hasher;
        _options = options;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.Value.Enabled)
        {
            _logger.LogInformation("Mongo seeding disabled.");
            return;
        }

        using var seedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        seedCts.CancelAfter(TimeSpan.FromSeconds(60));
        var ct = seedCts.Token;

        var db = _dbFactory.GetDatabase();

        var users         = db.GetCollection<User>("users");
        var bookings      = db.GetCollection<Booking>("bookings");
        var conversations = db.GetCollection<Conversation>("conversations");
        var messages      = db.GetCollection<BookingMessage>("messages");
        var reviews       = db.GetCollection<Review>("reviews");
        var notifications = db.GetCollection<Notification>("notifications");

        try
        {
            await EnsureIndexesAsync(users, conversations, ct);
        }
        catch (Exception ex) when (ex is TimeoutException or MongoConnectionException or OperationCanceledException)
        {
            _logger.LogError(ex,
                "MongoDB is not reachable. Start MongoDB or disable seeding (Seed:Enabled=false).");
            throw new InvalidOperationException("MongoDB is not reachable.", ex);
        }

        var pwd = _options.Value.DemoPassword;

        // ── Admin ─────────────────────────────────────────────────────────────
        var admin = await UpsertUserAsync(users, new User
        {
            Email        = _options.Value.AdminEmail,
            FullName     = "System Admin",
            Role         = UserRole.Admin,
            PasswordHash = _hasher.Hash(_options.Value.AdminPassword),
            Phone        = "+94711000000",
        }, ct);

        // ── Customers ─────────────────────────────────────────────────────────
        var customer1 = await UpsertUserAsync(users, new User
        {
            Email        = _options.Value.DemoCustomerEmail,
            FullName     = "Sarah Fernando",
            Role         = UserRole.Customer,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94771234567",
        }, ct);

        var customer2 = await UpsertUserAsync(users, new User
        {
            Email        = "james@example.com",
            FullName     = "James Perera",
            Role         = UserRole.Customer,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94779876543",
        }, ct);

        var customer3 = await UpsertUserAsync(users, new User
        {
            Email        = "priya@example.com",
            FullName     = "Priya Nair",
            Role         = UserRole.Customer,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94762345678",
        }, ct);

        var customer4 = await UpsertUserAsync(users, new User
        {
            Email        = "michael@example.com",
            FullName     = "Michael Silva",
            Role         = UserRole.Customer,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94755678901",
        }, ct);

        // ── Approved Vendors ──────────────────────────────────────────────────
        // Keep the original demo vendor account (vendor@example.com) for easy login testing
        await UpsertUserAsync(users, new User
        {
            Email        = _options.Value.DemoVendorEmail,
            FullName     = "Demo Vendor",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            BusinessName = "Demo Events Co.",
            Category     = "photography",
            Location     = "Colombo",
            Description  = "Demo vendor account for testing.",
            Services     = ["Photography", "Videography"],
            Pricing      = "From Rs. 50,000",
            PriceMin     = 50000,
            PriceMax     = 100000,
            Experience   = "5+ years",
            Photos       = [],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-60),
        }, ct);

        var vendor1 = await UpsertUserAsync(users, new User
        {
            Email        = "chamara@example.com",
            FullName     = "Chamara Bandara",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94701111111",
            BusinessName = "Lens & Light Photography",
            Category     = "photography",
            Location     = "Colombo",
            Description  = "Award-winning wedding and event photography studio with 8 years of experience capturing timeless moments across Sri Lanka.",
            Services     = ["Wedding Photography", "Event Photography", "Videography", "Drone Footage", "Photo Albums"],
            Pricing      = "Rs. 45,000 – 150,000",
            PriceMin     = 45000,
            PriceMax     = 150000,
            Experience   = "8 years",
            Photos       = [
                "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800",
                "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800",
                "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-30),
            Availability = [],
        }, ct);

        var vendor2 = await UpsertUserAsync(users, new User
        {
            Email        = "harmony@example.com",
            FullName     = "Dinesh Rajapaksa",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94702222222",
            BusinessName = "Harmony Sounds",
            Category     = "music",
            Location     = "Colombo",
            Description  = "Professional DJ and live band services for weddings, corporate events, and private parties. Full sound and lighting setup included.",
            Services     = ["DJ Services", "Live Band", "Sound System", "Lighting Setup", "MC Services"],
            Pricing      = "Rs. 30,000 – 90,000",
            PriceMin     = 30000,
            PriceMax     = 90000,
            Experience   = "6 years",
            Photos       = [
                "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
                "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-25),
            Availability = [],
        }, ct);

        var vendor3 = await UpsertUserAsync(users, new User
        {
            Email        = "bloom@example.com",
            FullName     = "Nimali Senanayake",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94703333333",
            BusinessName = "Bloom Decor",
            Category     = "decoration",
            Location     = "Kandy",
            Description  = "Creative floral and event decoration specialists. We transform any venue into a breathtaking space with custom themes and designs.",
            Services     = ["Floral Arrangements", "Stage Decoration", "Table Settings", "Balloon Decor", "Theme Setup"],
            Pricing      = "Rs. 25,000 – 80,000",
            PriceMin     = 25000,
            PriceMax     = 80000,
            Experience   = "5 years",
            Photos       = [
                "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800",
                "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-20),
            Availability = [],
        }, ct);

        var vendor4 = await UpsertUserAsync(users, new User
        {
            Email        = "royalbites@example.com",
            FullName     = "Ruwan Jayawardena",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94704444444",
            BusinessName = "Royal Bites Catering",
            Category     = "catering",
            Location     = "Galle",
            Description  = "Premium catering service specialising in traditional Sri Lankan and Western buffet cuisine. Hygiene-certified with a team of 20+ professional chefs.",
            Services     = ["Buffet Catering", "Cocktail Reception", "Wedding Cake", "Corporate Lunches", "Live Cooking Stations"],
            Pricing      = "Rs. 1,200 – 3,500 per head",
            PriceMin     = 1200,
            PriceMax     = 3500,
            Experience   = "10 years",
            Photos       = [
                "https://images.unsplash.com/photo-1555244162-803834f70033?w=800",
                "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-15),
            Availability = [],
        }, ct);

        var vendor5 = await UpsertUserAsync(users, new User
        {
            Email        = "glamgrace@example.com",
            FullName     = "Kavindya Wijesinghe",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94705555555",
            BusinessName = "Glam & Grace Beauty",
            Category     = "beauty",
            Location     = "Colombo",
            Description  = "Bridal and event makeup and hair styling studio. On-location service available island-wide. Specialise in traditional and contemporary looks.",
            Services     = ["Bridal Makeup", "Hair Styling", "Pre-Wedding Shoot Makeup", "Group Packages", "On-Site Service"],
            Pricing      = "Rs. 15,000 – 60,000",
            PriceMin     = 15000,
            PriceMax     = 60000,
            Experience   = "7 years",
            Photos       = [
                "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800",
                "https://images.unsplash.com/photo-1560066984-138daaa7e20c?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-10),
            Availability = [],
        }, ct);

        var vendor6 = await UpsertUserAsync(users, new User
        {
            Email        = "grandvista@example.com",
            FullName     = "Asitha Koswatte",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94706666666",
            BusinessName = "Grand Vista Venues",
            Category     = "venue",
            Location     = "Colombo",
            Description  = "Luxury event venue with panoramic city views. Accommodates up to 500 guests. Fully air-conditioned halls with integrated AV systems and in-house catering.",
            Services     = ["Banquet Hall", "Garden Venue", "Board Room", "AV Equipment", "In-House Catering"],
            Pricing      = "Rs. 150,000 – 500,000",
            PriceMin     = 150000,
            PriceMax     = 500000,
            Experience   = "12 years",
            Photos       = [
                "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
                "https://images.unsplash.com/photo-1561912774-79769a0a0a7a?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-5),
            Availability = [],
        }, ct);

        // ── 10 Additional Approved Vendors ───────────────────────────────────────

        var vendor7 = await UpsertUserAsync(users, new User
        {
            Email        = "niluka@example.com",
            FullName     = "Niluka Jayasinghe",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94707777777",
            BusinessName = "Niluka Photography Studio",
            Category     = "photography",
            Location     = "Kandy",
            Description  = "Based in the heart of Kandy, Niluka Photography Studio has been capturing the most cherished moments of Sri Lankan families for over nine years. Our studio team of five photographers specialises in intimate weddings, pre-wedding shoots against the stunning Kandyan backdrop, and vibrant cultural ceremonies. We combine traditional documentary-style photography with fine-art portrait techniques, delivering galleries that feel alive and deeply personal.\n\nEvery wedding package includes an on-site consultation at our Kandy studio, a full engagement shoot, unlimited edited high-resolution images, a luxury printed album, and a same-day highlights reel. Our drone operator provides breathtaking aerial views of your ceremony venue — whether it's the iconic Kandy Lake, a heritage hotel, or a lush hillside estate.\n\nWe have photographed over 400 weddings and have been featured in three leading Sri Lankan bridal magazines. Our work reflects our belief that photography is not just about pictures — it's about preserving the emotions, laughter, and tears that make each event uniquely yours.",
            Services     = [
                "Full Day Wedding Photography:Rs. 65,000",
                "Engagement Shoot:Rs. 18,000",
                "Drone Aerial Photography:Rs. 25,000",
                "Luxury Printed Album:Rs. 15,000",
                "Same-Day Edit Highlights:Rs. 20,000",
                "Corporate Event Photography:Rs. 35,000",
                "Cultural Ceremony Coverage:Rs. 40,000",
            ],
            Pricing      = "Rs. 35,000 – 120,000",
            PriceMin     = 35000,
            PriceMax     = 120000,
            Experience   = "9 years",
            Photos       = [
                "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800",
                "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
                "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800",
                "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800",
                "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800",
                "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800",
                "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800",
                "https://images.unsplash.com/photo-1531316282196-3f4ae16e34d3?w=800",
                "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800",
                "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800",
                "https://images.unsplash.com/photo-1520854221256-17e9b4bcf4a4?w=800",
                "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-50),
            Availability = [],
        }, ct);

        var vendor8 = await UpsertUserAsync(users, new User
        {
            Email        = "spiceroute@example.com",
            FullName     = "Raveendra Muthu",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94708888888",
            BusinessName = "Spice Route Catering",
            Category     = "catering",
            Location     = "Negombo",
            Description  = "Spice Route Catering was born from a passion for authentic Sri Lankan flavours and a desire to bring exceptional culinary experiences to every celebration. Founded in Negombo in 2016, we have grown from a small family kitchen into one of the most sought-after catering services on the Western coast. Our head chef, Raveendra Muthu, trained in both Colombo and Singapore and brings a fusion sensibility to traditional recipes without losing their heart.\n\nOur menus range from full traditional Sri Lankan rice-and-curry spreads to contemporary fusion tapas, live kottu stations, and international buffets for corporate events. We source our spices directly from certified farms in Matale and our seafood daily from Negombo fish markets, ensuring freshness that is unmatched. All dietary requirements — vegan, halal, gluten-free — are accommodated without compromise.\n\nWith a fleet of refrigerated vehicles and a professional service team of 30, we handle events from 50 to 2,000 guests. Our hygiene certification is renewed annually and we hold full liability insurance. Past clients include leading hotel chains, government functions, and three celebrity weddings.",
            Services     = [
                "Traditional Sri Lankan Buffet (per head):Rs. 1,500",
                "Fusion International Buffet (per head):Rs. 2,200",
                "Live Cooking Station Setup:Rs. 45,000",
                "Seafood BBQ Package:Rs. 85,000",
                "Corporate Lunch Box Service:Rs. 800 per box",
                "Dessert Table & Wedding Cake:Rs. 35,000",
                "Full Event Staffing (per person per day):Rs. 3,500",
            ],
            Pricing      = "Rs. 800 – 4,500 per head",
            PriceMin     = 800,
            PriceMax     = 4500,
            Experience   = "8 years",
            Photos       = [
                "https://images.unsplash.com/photo-1555244162-803834f70033?w=800",
                "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
                "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
                "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
                "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800",
                "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800",
                "https://images.unsplash.com/photo-1540189549336-e6e99eb4b0d2?w=800",
                "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800",
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-45),
            Availability = [],
        }, ct);

        var vendor9 = await UpsertUserAsync(users, new User
        {
            Email        = "enchanteddecor@example.com",
            FullName     = "Sanduni Wickramasinghe",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94709999999",
            BusinessName = "Enchanted Decor",
            Category     = "decoration",
            Location     = "Galle",
            Description  = "Enchanted Decor is a boutique event-styling studio based in Galle, renowned for transforming spaces into fairy-tale environments. Our founder, Sanduni Wickramasinghe, graduated with a degree in Interior Design from the University of Moratuwa and spent four years working with event design firms in Dubai before returning to Sri Lanka to bring world-class aesthetics to local celebrations.\n\nWe specialise in bespoke floral design, fabric draping, illuminated installations, and themed décor concepts. Each project begins with a detailed brief and mood-board session. We source our flowers from our own greenhouse outside Galle, giving us full control over quality and seasonality. Our signature styles range from rustic boho garden parties to opulent crystal-adorned ballroom galas.\n\nEnchanted Decor has styled over 250 weddings, 80 corporate launches, and 40 birthday celebrations. We are proud winners of the South Sri Lanka Event Design Award 2024 and regularly collaborate with boutique hotels along the Southern Coast. Our full team of 12 decorators is available for events from Galle to Colombo.",
            Services     = [
                "Full Venue Transformation:Rs. 120,000",
                "Floral Arrangements & Centrepieces:Rs. 45,000",
                "Fabric Draping & Canopy Setup:Rs. 35,000",
                "Illuminated Backdrop Design:Rs. 55,000",
                "Table Linen & Crockery Package:Rs. 25,000",
                "Balloon Art Installations:Rs. 18,000",
                "Photo Booth Styling:Rs. 12,000",
            ],
            Pricing      = "Rs. 12,000 – 200,000",
            PriceMin     = 12000,
            PriceMax     = 200000,
            Experience   = "6 years",
            Photos       = [
                "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800",
                "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
                "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800",
                "https://images.unsplash.com/photo-1553531087-b25d5dc7e614?w=800",
                "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800",
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
                "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800",
                "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800",
                "https://images.unsplash.com/photo-1525921429624-479b6a26d84d?w=800",
                "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-40),
            Availability = [],
        }, ct);

        var vendor10 = await UpsertUserAsync(users, new User
        {
            Email        = "paradisevenues@example.com",
            FullName     = "Thilanka Gunawardena",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94710000001",
            BusinessName = "Paradise Garden Venues",
            Category     = "venues",
            Location     = "Kandy",
            Description  = "Perched on a verdant hillside overlooking the Mahaweli River, Paradise Garden Venues offers two stunning event spaces that blend natural beauty with modern luxury. Our flagship Garden Pavilion seats 350 guests under a retractable glass roof, surrounded by manicured tropical gardens, koi ponds, and a cascading water feature. For more intimate gatherings, the Riverside Terrace accommodates 80 guests with open-air seating and river views that are unmatched in Kandy.\n\nEvery booking includes comprehensive event management support, in-house furniture (Chiavari chairs, round tables, custom linens), a full lighting rig, and dedicated parking for 200 vehicles. We maintain partnerships with top-tier caterers, florists, and entertainment agencies in Kandy, allowing us to offer complete event packages. Our professional events coordinator is available from the planning stage through to the final send-off.\n\nParadise Garden Venues has hosted weddings for diplomats, corporate retreats for multinational companies, and debut performances for acclaimed local artists. Our venue is TripAdvisor's top-rated event space in the Central Province for three consecutive years.",
            Services     = [
                "Garden Pavilion (full day):Rs. 180,000",
                "Riverside Terrace (half day):Rs. 65,000",
                "Complete Wedding Package:Rs. 350,000",
                "Corporate Retreat Package:Rs. 220,000",
                "AV & Lighting Rig:Rs. 40,000",
                "Valet Parking Service:Rs. 15,000",
                "Overnight Accommodation Coordination:Rs. 25,000",
            ],
            Pricing      = "Rs. 65,000 – 500,000",
            PriceMin     = 65000,
            PriceMax     = 500000,
            Experience   = "11 years",
            Photos       = [
                "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
                "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=800",
                "https://images.unsplash.com/photo-1549451371-64aa98a6f660?w=800",
                "https://images.unsplash.com/photo-1561912774-79769a0a0a7a?w=800",
                "https://images.unsplash.com/photo-1561329598-02ad5571cb74?w=800",
                "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800",
                "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
                "https://images.unsplash.com/photo-1524373050940-8f19e9b858a9?w=800",
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
                "https://images.unsplash.com/photo-1578322350645-9bca94cfcc83?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-35),
            Availability = [],
        }, ct);

        var vendor11 = await UpsertUserAsync(users, new User
        {
            Email        = "soundwave@example.com",
            FullName     = "Hasitha Amaratunga",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94710000002",
            BusinessName = "Sound Wave Entertainment",
            Category     = "music",
            Location     = "Gampaha",
            Description  = "Sound Wave Entertainment is the Western Province's premier full-service music and entertainment company. Led by Hasitha Amaratunga — a classically trained musician and professional DJ with 11 years in the industry — our team of eight artists covers everything from string quartets for ceremony ceremonies to high-energy DJ sets that keep dancefloors packed until midnight.\n\nOur equipment inventory includes a professional-grade Meyer Sound PA system, an 8-channel LED moving-head lighting rig, a custom-built DJ booth, and a full live band backline. All equipment is PAT-tested and maintained quarterly. We also offer karaoke systems, photobooth integration, and interactive entertainment packages for children's events.\n\nWe have performed at over 600 events including three presidential functions, six international conferences at Colombo's top hotels, and hundreds of private weddings. Sound Wave Entertainment is fully insured and holds all relevant performance licences. Our bilingual MCs are experienced in both Sinhala and English, ensuring smooth flow for any audience.",
            Services     = [
                "Professional DJ Set (6 hours):Rs. 55,000",
                "Live Band Performance (4 hours):Rs. 90,000",
                "Full PA & Lighting Rig:Rs. 40,000",
                "String Quartet (2 hours):Rs. 35,000",
                "Bilingual MC Services:Rs. 20,000",
                "Karaoke System Setup:Rs. 15,000",
                "Corporate Entertainment Package:Rs. 120,000",
            ],
            Pricing      = "Rs. 15,000 – 150,000",
            PriceMin     = 15000,
            PriceMax     = 150000,
            Experience   = "11 years",
            Photos       = [
                "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
                "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800",
                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
                "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800",
                "https://images.unsplash.com/photo-1501612780327-45045538702b?w=800",
                "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
                "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800",
                "https://images.unsplash.com/photo-1571266028243-3716e2d6fb6e?w=800",
                "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800",
                "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-30),
            Availability = [],
        }, ct);

        var vendor12 = await UpsertUserAsync(users, new User
        {
            Email        = "dazzlebeauty@example.com",
            FullName     = "Thisari Ratnayake",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94710000003",
            BusinessName = "Dazzle Beauty Studio",
            Category     = "beauty",
            Location     = "Colombo",
            Description  = "Dazzle Beauty Studio is a leading bridal and editorial makeup studio based in Colombo 5. Our principal artist, Thisari Ratnayake, holds advanced certifications from the London School of Beauty and has assisted at fashion weeks in Dubai and Mumbai. The studio team of six artists collectively brings over 40 years of experience across bridal, film, fashion, and theatrical makeup.\n\nOur studio uses only premium cruelty-free and hypoallergenic products — MAC, Charlotte Tilbury, Armani Beauty, and Huda Beauty — ensuring flawless finish under all lighting conditions including harsh outdoor sun and low-light evening receptions. We offer on-location services across the island, travelling to Kandy, Galle, and Jaffna for destination weddings. Our bridal packages include a trial session, day-of application, touch-up kit, and a consultation call two weeks before the event.\n\nDazzle Beauty Studio has styled brides for weddings featured in Wedding Bells magazine, handled makeup for six commercial shoots in 2025, and completed hair and makeup for the Miss Sri Lanka Western Province pageant. Thisari personally mentors junior makeup artists through a biannual workshop programme.",
            Services     = [
                "Full Bridal Package (trial + day):Rs. 35,000",
                "Bridesmaid Group Package (4 persons):Rs. 28,000",
                "Groom Grooming & Styling:Rs. 8,000",
                "On-Location Hair Styling:Rs. 12,000",
                "Pre-Wedding Shoot Makeup:Rs. 15,000",
                "Saree Draping & Styling:Rs. 6,000",
                "Hair Extensions & Updos:Rs. 10,000",
            ],
            Pricing      = "Rs. 6,000 – 75,000",
            PriceMin     = 6000,
            PriceMax     = 75000,
            Experience   = "10 years",
            Photos       = [
                "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800",
                "https://images.unsplash.com/photo-1560066984-138daaa7e20c?w=800",
                "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800",
                "https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=800",
                "https://images.unsplash.com/photo-1522337660329-de0be7983e1b?w=800",
                "https://images.unsplash.com/photo-1595867818082-a3d36b79f5a8?w=800",
                "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=800",
                "https://images.unsplash.com/photo-1583388606471-b8e67c4d0e9d?w=800",
                "https://images.unsplash.com/photo-1457449940276-e8deed18bfff?w=800",
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-28),
            Availability = [],
        }, ct);

        var vendor13 = await UpsertUserAsync(users, new User
        {
            Email        = "crystallens@example.com",
            FullName     = "Malshan Peris",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94710000004",
            BusinessName = "Crystal Lens Photography",
            Category     = "photography",
            Location     = "Galle",
            Description  = "Crystal Lens Photography operates from a converted Dutch colonial building in Galle Fort, offering a one-of-a-kind backdrop for studio sessions while covering events across the Southern Province and beyond. Founder Malshan Peris is an award-winning photojournalist who transitioned to wedding and lifestyle photography in 2018, bringing a powerful storytelling instinct to every shoot.\n\nOur aesthetic leans toward editorial and cinematic — moody, rich-toned images that feel like stills from a film. We use a combination of Nikon Z-series mirrorless cameras and Leica medium-format for portrait work, along with off-camera flash systems that create dramatic yet flattering light in any environment. All images are colour-graded using our signature LUT presets before delivery.\n\nCrystal Lens offers South Sri Lanka's only underwater couples shoot service, conducted in collaboration with a certified dive instructor at Hikkaduwa reef. Our aerial photography coverage using a licensed drone operator completes our full creative offering. We accept a maximum of 20 wedding bookings per year to ensure undivided attention to every couple.",
            Services     = [
                "Full Wedding Documentary Package:Rs. 95,000",
                "Cinematic Wedding Film (10 min):Rs. 75,000",
                "Underwater Couples Shoot:Rs. 40,000",
                "Drone Aerial Coverage:Rs. 30,000",
                "Destination Pre-Wedding Shoot:Rs. 55,000",
                "Corporate Brand Photography:Rs. 45,000",
                "Premium Photobook (30 pages):Rs. 22,000",
            ],
            Pricing      = "Rs. 22,000 – 180,000",
            PriceMin     = 22000,
            PriceMax     = 180000,
            Experience   = "6 years",
            Photos       = [
                "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800",
                "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800",
                "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800",
                "https://images.unsplash.com/photo-1531316282196-3f4ae16e34d3?w=800",
                "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800",
                "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
                "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=800",
                "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800",
                "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800",
                "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-22),
            Availability = [],
        }, ct);

        var vendor14 = await UpsertUserAsync(users, new User
        {
            Email        = "goldenspoon@example.com",
            FullName     = "Chamila Samaranayake",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94710000005",
            BusinessName = "Golden Spoon Catering",
            Category     = "catering",
            Location     = "Colombo",
            Description  = "Golden Spoon Catering has been feeding Sri Lanka's most celebrated events since 2013. Our executive team of eight chefs combines classical French training with deep knowledge of Sri Lankan, Indian, and Middle Eastern cuisines — a combination that consistently wins over guests expecting the ordinary. We believe every dish served at an event is a reflection of the host's taste, and we take that responsibility seriously.\n\nWe operate from a commercial kitchen in Colombo 10 that is certified by the Colombo Municipal Council and audited by an independent food safety consultant twice yearly. Our cold-chain logistics team ensures that every item — from delicate seafood to dairy-based desserts — arrives at your venue at the correct temperature. We can serve hot, freshly cooked meals for up to 3,000 guests simultaneously thanks to our fleet of six catering vehicles equipped with commercial-grade hot holding units.\n\nSpecialities include our signature Ceylon curry buffet (14 curries + 6 sambols), our live pasta and wok station, our artisan dessert table service, and our award-winning wedding cake designs. Golden Spoon was named Best Catering Company in Colombo at the 2024 Lanka Events Awards.",
            Services     = [
                "Ceylon Curry Buffet (per head):Rs. 1,800",
                "Continental & Asian Fusion Buffet (per head):Rs. 2,500",
                "Live Pasta & Wok Station:Rs. 55,000",
                "Artisan Dessert Table:Rs. 40,000",
                "Custom Wedding Cake:Rs. 25,000",
                "Corporate Luncheon Package:Rs. 1,200 per head",
                "Full Event Service Crew (per 50 guests):Rs. 18,000",
            ],
            Pricing      = "Rs. 1,200 – 5,000 per head",
            PriceMin     = 1200,
            PriceMax     = 5000,
            Experience   = "11 years",
            Photos       = [
                "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800",
                "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
                "https://images.unsplash.com/photo-1555244162-803834f70033?w=800",
                "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
                "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
                "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800",
                "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800",
                "https://images.unsplash.com/photo-1540189549336-e6e99eb4b0d2?w=800",
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-18),
            Availability = [],
        }, ct);

        var vendor15 = await UpsertUserAsync(users, new User
        {
            Email        = "petalbloom@example.com",
            FullName     = "Ishara Dasanayake",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94710000006",
            BusinessName = "Petal & Bloom Decor",
            Category     = "decoration",
            Location     = "Colombo",
            Description  = "Petal & Bloom Decor is a full-service event design company based in Colombo, known for creating breathtakingly lush floral and botanical environments. Our creative director, Ishara Dasanayake, trained under a master florist in the Netherlands before returning to Sri Lanka in 2019. In five years, the studio has established itself as one of Colombo's most trusted names in high-end event styling.\n\nWe grow a significant portion of our flowers in our own 1.5-acre greenhouse in Horana, giving us year-round access to specialty blooms including peonies, garden roses, lisianthus, and proteas that most local suppliers cannot provide. We supplement with ethically sourced imports from Holland and Ecuador to fulfil our full creative vision. Our décor installations are designed to a centimetre-level precision, with a dedicated team of eight stylists who arrive six hours before each event.\n\nPetal & Bloom's portfolio spans intimate backyard garden parties, 600-guest luxury ballroom weddings, product launches for international beauty brands, and pop-up floral art installations. We were the exclusive décor partner for the 2024 Colombo Luxury Wedding Expo and have been featured in Vogue India's Sri Lanka Special Edition.",
            Services     = [
                "Full Ballroom Floral Design:Rs. 180,000",
                "Bridal Arch & Aisle Styling:Rs. 55,000",
                "Table Centrepiece Collection (per table):Rs. 4,500",
                "Flower Wall & Photo Backdrop:Rs. 35,000",
                "Ceremony Stage Florals:Rs. 65,000",
                "Welcome Entrance Display:Rs. 22,000",
                "Boutonniere & Bridesmaid Bouquets:Rs. 15,000",
            ],
            Pricing      = "Rs. 15,000 – 250,000",
            PriceMin     = 15000,
            PriceMax     = 250000,
            Experience   = "5 years",
            Photos       = [
                "https://images.unsplash.com/photo-1553531087-b25d5dc7e614?w=800",
                "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800",
                "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800",
                "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
                "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800",
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
                "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800",
                "https://images.unsplash.com/photo-1525921429624-479b6a26d84d?w=800",
                "https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800",
                "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-12),
            Availability = [],
        }, ct);

        var vendor16 = await UpsertUserAsync(users, new User
        {
            Email        = "skyviewhall@example.com",
            FullName     = "Dinuka Fonseka",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            Phone        = "+94710000007",
            BusinessName = "Skyview Hall",
            Category     = "venues",
            Location     = "Colombo",
            Description  = "Skyview Hall occupies the 32nd and 33rd floors of a landmark tower in Colombo's business district, offering the city's most dramatic skyline backdrop for any celebration. Our 800-seat Grand Ballroom and 200-seat Sky Lounge together create a versatile event campus that has hosted everything from state dinners to intimate cocktail launches. Every window offers panoramic views of the Indian Ocean, Beira Lake, and the illuminated Colombo skyline after dark.\n\nThe venue's interior was designed by an award-winning Sri Lankan architect and features floor-to-ceiling glass walls, a polished black granite dance floor, integrated 4K projection screens across four walls, and a Dolby Atmos sound system. Our full-time in-house events team of 15 professionals handle everything from floral arrangements to valet parking, making us the preferred choice for hosts who want seamless execution with zero stress.\n\nSkyview Hall is fully accessible, offers dedicated bridal suites with en-suite bathrooms, private elevator access, and a complimentary one-hour pre-event consultation with our senior event manager. We have hosted over 300 weddings, 150 corporate galas, and three charity events for international NGOs. Our Sky Lounge is available for intimate events of 20 guests upward.",
            Services     = [
                "Grand Ballroom (full day, up to 800 guests):Rs. 450,000",
                "Sky Lounge (half day, up to 200 guests):Rs. 120,000",
                "Complete Wedding Package:Rs. 650,000",
                "Corporate Gala Package:Rs. 380,000",
                "Dolby Atmos AV Setup:Rs. 65,000",
                "Bridal Suite (full day):Rs. 25,000",
                "Extended Evening (to midnight):Rs. 50,000",
            ],
            Pricing      = "Rs. 120,000 – 700,000",
            PriceMin     = 120000,
            PriceMax     = 700000,
            Experience   = "7 years",
            Photos       = [
                "https://images.unsplash.com/photo-1587271407850-8d438ca9fdf2?w=800",
                "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
                "https://images.unsplash.com/photo-1549451371-64aa98a6f660?w=800",
                "https://images.unsplash.com/photo-1561912774-79769a0a0a7a?w=800",
                "https://images.unsplash.com/photo-1561329598-02ad5571cb74?w=800",
                "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800",
                "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
                "https://images.unsplash.com/photo-1524373050940-8f19e9b858a9?w=800",
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
                "https://images.unsplash.com/photo-1578322350645-9bca94cfcc83?w=800",
            ],
            Approved     = true,
            ApprovedAt   = DateTimeOffset.UtcNow.AddDays(-8),
            Availability = [],
        }, ct);

        // ── Pending vendors (for admin approvals demo) ────────────────────────
        await UpsertUserAsync(users, new User
        {
            Email        = "pendingvendor@example.com",
            FullName     = "Saman Kumara",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            BusinessName = "Perfect Catering",
            Category     = "catering",
            Location     = "Kandy",
            Description  = "Specialised in traditional Sri Lankan wedding catering with 200+ successful events.",
            Approved     = false,
        }, ct);

        await UpsertUserAsync(users, new User
        {
            Email        = "pendingvendor2@example.com",
            FullName     = "Dilani Rathnayake",
            Role         = UserRole.Vendor,
            PasswordHash = _hasher.Hash(pwd),
            BusinessName = "StarShot Studios",
            Category     = "photography",
            Location     = "Negombo",
            Description  = "Cinematic wedding films and photography. Available island-wide.",
            Approved     = false,
        }, ct);

        // ── Bookings ──────────────────────────────────────────────────────────
        // Each booking is created only once (idempotent check on CustomerId+VendorId+EventDate).

        // 1. Completed — Sarah + Lens & Light (past event, has review)
        var b1 = await UpsertBookingAsync(bookings, new Booking
        {
            Id                  = NewId(),
            CustomerId          = customer1.Id,
            CustomerName        = customer1.FullName,
            VendorId            = vendor1.Id,
            VendorName          = vendor1.FullName,
            VendorBusinessName  = vendor1.BusinessName!,
            Service             = "Wedding Photography",
            EventDate           = Ago(30),
            EventType           = "Wedding",
            GuestCount          = 200,
            Budget              = "Rs. 80,000",
            SpecialRequests     = "Focus on candid shots and family portraits.",
            Status              = BookingStatus.Completed,
            VendorResponseNote  = "We would love to capture your special day!",
            CreatedAt           = DateTimeOffset.UtcNow.AddDays(-45),
            UpdatedAt           = DateTimeOffset.UtcNow.AddDays(-30),
        }, ct);

        // 2. Completed — James + Harmony Sounds (past event, has review)
        var b2 = await UpsertBookingAsync(bookings, new Booking
        {
            Id                  = NewId(),
            CustomerId          = customer2.Id,
            CustomerName        = customer2.FullName,
            VendorId            = vendor2.Id,
            VendorName          = vendor2.FullName,
            VendorBusinessName  = vendor2.BusinessName!,
            Service             = "DJ Services",
            EventDate           = Ago(20),
            EventType           = "Birthday Party",
            GuestCount          = 80,
            Budget              = "Rs. 45,000",
            SpecialRequests     = "Need a mix of Sinhala and English pop hits.",
            Status              = BookingStatus.Completed,
            VendorResponseNote  = "We have an amazing set lined up for you!",
            CreatedAt           = DateTimeOffset.UtcNow.AddDays(-35),
            UpdatedAt           = DateTimeOffset.UtcNow.AddDays(-20),
        }, ct);

        // 3. Accepted — Priya + Bloom Decor (upcoming)
        var b3 = await UpsertBookingAsync(bookings, new Booking
        {
            Id                  = NewId(),
            CustomerId          = customer3.Id,
            CustomerName        = customer3.FullName,
            VendorId            = vendor3.Id,
            VendorName          = vendor3.FullName,
            VendorBusinessName  = vendor3.BusinessName!,
            Service             = "Stage Decoration",
            EventDate           = Ahead(14),
            EventType           = "Engagement",
            GuestCount          = 120,
            Budget              = "Rs. 55,000",
            SpecialRequests     = "Prefer pastel pink and white colour theme.",
            Status              = BookingStatus.Accepted,
            VendorResponseNote  = "Lovely theme choice! We will send a mood board.",
            CreatedAt           = DateTimeOffset.UtcNow.AddDays(-7),
            UpdatedAt           = DateTimeOffset.UtcNow.AddDays(-5),
        }, ct);

        // 4. Accepted — Michael + Royal Bites Catering (upcoming)
        var b4 = await UpsertBookingAsync(bookings, new Booking
        {
            Id                  = NewId(),
            CustomerId          = customer4.Id,
            CustomerName        = customer4.FullName,
            VendorId            = vendor4.Id,
            VendorName          = vendor4.FullName,
            VendorBusinessName  = vendor4.BusinessName!,
            Service             = "Buffet Catering",
            EventDate           = Ahead(21),
            EventType           = "Corporate Event",
            GuestCount          = 300,
            Budget              = "Rs. 900,000",
            SpecialRequests     = "Vegetarian options required for 30% of guests.",
            Status              = BookingStatus.Accepted,
            VendorResponseNote  = "We will ensure a separate vegetarian station.",
            CreatedAt           = DateTimeOffset.UtcNow.AddDays(-10),
            UpdatedAt           = DateTimeOffset.UtcNow.AddDays(-8),
        }, ct);

        // 5. Pending — Sarah + Glam & Grace (awaiting vendor response)
        var b5 = await UpsertBookingAsync(bookings, new Booking
        {
            Id                  = NewId(),
            CustomerId          = customer1.Id,
            CustomerName        = customer1.FullName,
            VendorId            = vendor5.Id,
            VendorName          = vendor5.FullName,
            VendorBusinessName  = vendor5.BusinessName!,
            Service             = "Bridal Makeup",
            EventDate           = Ahead(30),
            EventType           = "Wedding",
            GuestCount          = 1,
            Budget              = "Rs. 25,000",
            SpecialRequests     = "Looking for a natural dewy look.",
            Status              = BookingStatus.Pending,
            CreatedAt           = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt           = DateTimeOffset.UtcNow.AddDays(-1),
        }, ct);

        // 6. Pending — James + Grand Vista Venues (awaiting vendor response)
        var b6 = await UpsertBookingAsync(bookings, new Booking
        {
            Id                  = NewId(),
            CustomerId          = customer2.Id,
            CustomerName        = customer2.FullName,
            VendorId            = vendor6.Id,
            VendorName          = vendor6.FullName,
            VendorBusinessName  = vendor6.BusinessName!,
            Service             = "Banquet Hall",
            EventDate           = Ahead(45),
            EventType           = "Wedding Reception",
            GuestCount          = 400,
            Budget              = "Rs. 350,000",
            SpecialRequests     = "Need the rooftop garden area for the cocktail hour.",
            Status              = BookingStatus.Pending,
            CreatedAt           = DateTimeOffset.UtcNow.AddHours(-6),
            UpdatedAt           = DateTimeOffset.UtcNow.AddHours(-6),
        }, ct);

        // 7. Rejected — Priya + Lens & Light (vendor was unavailable)
        var b7 = await UpsertBookingAsync(bookings, new Booking
        {
            Id                  = NewId(),
            CustomerId          = customer3.Id,
            CustomerName        = customer3.FullName,
            VendorId            = vendor1.Id,
            VendorName          = vendor1.FullName,
            VendorBusinessName  = vendor1.BusinessName!,
            Service             = "Event Photography",
            EventDate           = Ahead(7),
            EventType           = "Birthday Party",
            GuestCount          = 50,
            Budget              = "Rs. 30,000",
            Status              = BookingStatus.Rejected,
            VendorResponseNote  = "Unfortunately we are fully booked on this date. Please try another date.",
            CreatedAt           = DateTimeOffset.UtcNow.AddDays(-3),
            UpdatedAt           = DateTimeOffset.UtcNow.AddDays(-2),
        }, ct);

        // 8. Cancelled — Michael + Bloom Decor (customer cancelled)
        var b8 = await UpsertBookingAsync(bookings, new Booking
        {
            Id                  = NewId(),
            CustomerId          = customer4.Id,
            CustomerName        = customer4.FullName,
            VendorId            = vendor3.Id,
            VendorName          = vendor3.FullName,
            VendorBusinessName  = vendor3.BusinessName!,
            Service             = "Floral Arrangements",
            EventDate           = Ahead(10),
            EventType           = "Anniversary",
            GuestCount          = 60,
            Budget              = "Rs. 20,000",
            Status              = BookingStatus.Cancelled,
            CreatedAt           = DateTimeOffset.UtcNow.AddDays(-5),
            UpdatedAt           = DateTimeOffset.UtcNow.AddDays(-4),
        }, ct);

        // ── Conversations + Messages (for accepted/completed bookings) ─────────
        var conv1 = await UpsertConversationAsync(conversations, new Conversation
        {
            Id              = NewId(),
            CustomerId      = customer1.Id,
            CustomerName    = customer1.FullName,
            VendorId        = vendor1.Id,
            VendorName      = vendor1.BusinessName!,
            LastMessage     = "Thank you so much! The photos are absolutely stunning.",
            LastMessageTime = DateTimeOffset.UtcNow.AddDays(-29),
            CreatedAt       = DateTimeOffset.UtcNow.AddDays(-44),
            UpdatedAt       = DateTimeOffset.UtcNow.AddDays(-29),
        }, ct);

        await UpsertMessagesAsync(messages, conv1.Id, [
            (customer1.Id, customer1.FullName, vendor1.Id, "Hi! We're so excited for our wedding shoot. Any tips on what to wear?", DateTimeOffset.UtcNow.AddDays(-44)),
            (vendor1.Id,   vendor1.FullName,  customer1.Id, "Congratulations! Soft pastel colours photograph beautifully. Avoid busy patterns.", DateTimeOffset.UtcNow.AddDays(-43)),
            (customer1.Id, customer1.FullName, vendor1.Id, "Perfect, thank you! Will you bring a second shooter?", DateTimeOffset.UtcNow.AddDays(-42)),
            (vendor1.Id,   vendor1.FullName,  customer1.Id, "Yes, we always bring a second shooter for weddings. You're in good hands!", DateTimeOffset.UtcNow.AddDays(-41)),
            (customer1.Id, customer1.FullName, vendor1.Id, "Thank you so much! The photos are absolutely stunning.", DateTimeOffset.UtcNow.AddDays(-29)),
        ], ct);

        var conv3 = await UpsertConversationAsync(conversations, new Conversation
        {
            Id              = NewId(),
            CustomerId      = customer3.Id,
            CustomerName    = customer3.FullName,
            VendorId        = vendor3.Id,
            VendorName      = vendor3.BusinessName!,
            LastMessage     = "The mood board looks incredible, we love it!",
            LastMessageTime = DateTimeOffset.UtcNow.AddDays(-4),
            CreatedAt       = DateTimeOffset.UtcNow.AddDays(-6),
            UpdatedAt       = DateTimeOffset.UtcNow.AddDays(-4),
        }, ct);

        await UpsertMessagesAsync(messages, conv3.Id, [
            (vendor3.Id,   vendor3.FullName,  customer3.Id, "Hello Priya! I've put together a mood board for your engagement. Sending it over now.", DateTimeOffset.UtcNow.AddDays(-5)),
            (customer3.Id, customer3.FullName, vendor3.Id, "The mood board looks incredible, we love it!", DateTimeOffset.UtcNow.AddDays(-4)),
            (vendor3.Id,   vendor3.FullName,  customer3.Id, "Wonderful! We'll begin sourcing the flowers this week.", DateTimeOffset.UtcNow.AddDays(-4)),
        ], ct);

        var conv4 = await UpsertConversationAsync(conversations, new Conversation
        {
            Id              = NewId(),
            CustomerId      = customer4.Id,
            CustomerName    = customer4.FullName,
            VendorId        = vendor4.Id,
            VendorName      = vendor4.BusinessName!,
            LastMessage     = "We will have a dedicated vegetarian section with full labelling.",
            LastMessageTime = DateTimeOffset.UtcNow.AddDays(-7),
            CreatedAt       = DateTimeOffset.UtcNow.AddDays(-9),
            UpdatedAt       = DateTimeOffset.UtcNow.AddDays(-7),
        }, ct);

        await UpsertMessagesAsync(messages, conv4.Id, [
            (customer4.Id, customer4.FullName, vendor4.Id, "Can you accommodate guests with nut allergies?", DateTimeOffset.UtcNow.AddDays(-9)),
            (vendor4.Id,   vendor4.FullName,  customer4.Id, "Absolutely. We will clearly label all dishes and keep nut-free items separate.", DateTimeOffset.UtcNow.AddDays(-8)),
            (customer4.Id, customer4.FullName, vendor4.Id, "Also please note 30% need vegetarian options.", DateTimeOffset.UtcNow.AddDays(-8)),
            (vendor4.Id,   vendor4.FullName,  customer4.Id, "We will have a dedicated vegetarian section with full labelling.", DateTimeOffset.UtcNow.AddDays(-7)),
        ], ct);

        // ── Reviews (for completed bookings) ──────────────────────────────────
        await UpsertReviewAsync(reviews, new Review
        {
            Id           = NewId(),
            BookingId    = b1.Id,
            CustomerId   = customer1.Id,
            CustomerName = customer1.FullName,
            VendorId     = vendor1.Id,
            Rating       = 5,
            Comment      = "Chamara and his team were absolutely phenomenal! Every moment was captured beautifully. The candid shots brought tears to our eyes. Highly recommend Lens & Light to any couple!",
            CreatedAt    = DateTimeOffset.UtcNow.AddDays(-28),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id           = NewId(),
            BookingId    = b2.Id,
            CustomerId   = customer2.Id,
            CustomerName = customer2.FullName,
            VendorId     = vendor2.Id,
            Rating       = 4,
            Comment      = "Dinesh kept the energy going all night! Great music selection and the lighting setup was impressive. Minor issue with the mic at the start but it was sorted quickly. Would book again.",
            CreatedAt    = DateTimeOffset.UtcNow.AddDays(-18),
        }, ct);

        // ── More completed bookings (creating cross-vendor review relationships) ─

        // Priya reviews Royal Bites — a wedding she had 45 days ago
        var bX1 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer3.Id, CustomerName = customer3.FullName,
            VendorId = vendor4.Id, VendorName = vendor4.FullName, VendorBusinessName = vendor4.BusinessName!,
            Service = "Buffet Catering", EventDate = Ago(45), EventType = "Wedding",
            GuestCount = 250, Budget = "Rs. 625,000",
            SpecialRequests = "Traditional Sri Lankan menu preferred.",
            Status = BookingStatus.Completed, VendorResponseNote = "Absolutely, we have a wonderful traditional menu ready.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-60), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-45),
        }, ct);

        // Michael reviews Glam & Grace — used for his sister's wedding
        var bX2 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer4.Id, CustomerName = customer4.FullName,
            VendorId = vendor5.Id, VendorName = vendor5.FullName, VendorBusinessName = vendor5.BusinessName!,
            Service = "Bridal Makeup", EventDate = Ago(38), EventType = "Wedding",
            GuestCount = 1, Budget = "Rs. 35,000",
            SpecialRequests = "Traditional Kandyan bridal look requested.",
            Status = BookingStatus.Completed, VendorResponseNote = "We specialise in Kandyan looks!",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-55), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-38),
        }, ct);

        // Sarah reviews Grand Vista — used for her company event
        var bX3 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer1.Id, CustomerName = customer1.FullName,
            VendorId = vendor6.Id, VendorName = vendor6.FullName, VendorBusinessName = vendor6.BusinessName!,
            Service = "Banquet Hall", EventDate = Ago(55), EventType = "Corporate Gala",
            GuestCount = 280, Budget = "Rs. 280,000",
            SpecialRequests = "Projector setup and stage required.",
            Status = BookingStatus.Completed, VendorResponseNote = "Full AV setup will be ready for you.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-70), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-55),
        }, ct);

        // James reviews Bloom Decor — used for his parents' anniversary
        var bX4 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer2.Id, CustomerName = customer2.FullName,
            VendorId = vendor3.Id, VendorName = vendor3.FullName, VendorBusinessName = vendor3.BusinessName!,
            Service = "Stage Decoration", EventDate = Ago(50), EventType = "Anniversary",
            GuestCount = 80, Budget = "Rs. 40,000",
            SpecialRequests = "Gold and white colour theme.",
            Status = BookingStatus.Completed, VendorResponseNote = "Beautiful choice, we'll create something timeless.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-65), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-50),
        }, ct);

        // customer1 reviews vendor7 (Niluka Photography)
        var bX5 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer1.Id, CustomerName = customer1.FullName,
            VendorId = vendor7.Id, VendorName = vendor7.FullName, VendorBusinessName = vendor7.BusinessName!,
            Service = "Engagement Shoot", EventDate = Ago(25), EventType = "Engagement",
            GuestCount = 2, Budget = "Rs. 18,000", Status = BookingStatus.Completed,
            VendorResponseNote = "Looking forward to capturing your special day!",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-40), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-25),
        }, ct);

        // customer2 reviews vendor8 (Spice Route Catering)
        var bX6 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer2.Id, CustomerName = customer2.FullName,
            VendorId = vendor8.Id, VendorName = vendor8.FullName, VendorBusinessName = vendor8.BusinessName!,
            Service = "Traditional Sri Lankan Buffet (per head)", EventDate = Ago(33), EventType = "Baby Shower",
            GuestCount = 120, Budget = "Rs. 180,000", Status = BookingStatus.Completed,
            VendorResponseNote = "Great choice! We'll bring our full team.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-48), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-33),
        }, ct);

        // customer3 reviews vendor9 (Enchanted Decor)
        var bX7 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer3.Id, CustomerName = customer3.FullName,
            VendorId = vendor9.Id, VendorName = vendor9.FullName, VendorBusinessName = vendor9.BusinessName!,
            Service = "Full Venue Transformation", EventDate = Ago(42), EventType = "Wedding",
            GuestCount = 180, Budget = "Rs. 120,000", Status = BookingStatus.Completed,
            VendorResponseNote = "We will create something truly enchanting.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-57), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-42),
        }, ct);

        // customer4 reviews vendor11 (Sound Wave Entertainment)
        var bX8 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer4.Id, CustomerName = customer4.FullName,
            VendorId = vendor11.Id, VendorName = vendor11.FullName, VendorBusinessName = vendor11.BusinessName!,
            Service = "Live Band Performance (4 hours)", EventDate = Ago(28), EventType = "Corporate Event",
            GuestCount = 200, Budget = "Rs. 90,000", Status = BookingStatus.Completed,
            VendorResponseNote = "Our band has the perfect setlist for corporate events.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-43), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-28),
        }, ct);

        // customer1 reviews vendor14 (Golden Spoon)
        var bX9 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer1.Id, CustomerName = customer1.FullName,
            VendorId = vendor14.Id, VendorName = vendor14.FullName, VendorBusinessName = vendor14.BusinessName!,
            Service = "Ceylon Curry Buffet (per head)", EventDate = Ago(20), EventType = "Birthday Party",
            GuestCount = 90, Budget = "Rs. 162,000", Status = BookingStatus.Completed,
            VendorResponseNote = "Our curry buffet will be the highlight of the party!",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-35), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-20),
        }, ct);

        // customer2 reviews vendor15 (Petal & Bloom)
        var bX10 = await UpsertBookingAsync(bookings, new Booking
        {
            Id = NewId(), CustomerId = customer2.Id, CustomerName = customer2.FullName,
            VendorId = vendor15.Id, VendorName = vendor15.FullName, VendorBusinessName = vendor15.BusinessName!,
            Service = "Full Ballroom Floral Design", EventDate = Ago(15), EventType = "Wedding",
            GuestCount = 320, Budget = "Rs. 180,000", Status = BookingStatus.Completed,
            VendorResponseNote = "We'll create a floral dreamscape for your guests.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-30), UpdatedAt = DateTimeOffset.UtcNow.AddDays(-15),
        }, ct);

        // ── Reviews for all completed bookings ────────────────────────────────
        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX1.Id, CustomerId = customer3.Id, CustomerName = customer3.FullName,
            VendorId = vendor4.Id, Rating = 5,
            Comment = "Royal Bites absolutely delivered! The spread was enormous — 14 types of curries and the most flavourful pol sambol I've ever tasted at a wedding. 250 guests and not a single complaint about the food. The service team was professional and kept the stations spotless throughout. Highly recommend for anyone wanting authentic Sri Lankan food at scale.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-43),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX2.Id, CustomerId = customer4.Id, CustomerName = customer4.FullName,
            VendorId = vendor5.Id, Rating = 5,
            Comment = "Kavindya is an absolute artist. She completely understood the traditional Kandyan look we wanted and executed it flawlessly. My sister looked breathtaking and the makeup stayed perfect through the entire 10-hour celebration. The bride's trial session two weeks before was thorough and reassuring. The team arrived on time and were so professional.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-36),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX3.Id, CustomerId = customer1.Id, CustomerName = customer1.FullName,
            VendorId = vendor6.Id, Rating = 5,
            Comment = "Grand Vista exceeded every expectation for our company gala. The city views at night were jaw-dropping and our 280 guests were completely wowed. The AV setup was flawless — crystal clear audio and the projection screens enhanced every presentation. The in-house team coordinated everything seamlessly so we could just enjoy the evening. Would absolutely book again.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-53),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX4.Id, CustomerId = customer2.Id, CustomerName = customer2.FullName,
            VendorId = vendor3.Id, Rating = 4,
            Comment = "Bloom Decor transformed the hall beautifully for my parents' 30th anniversary. The gold and white theme was executed with real elegance. Only minor issue was one of the centrepieces arriving slightly late, but Nimali's team sorted it within 20 minutes and the end result was stunning. Very reasonable pricing for the quality.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-48),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX5.Id, CustomerId = customer1.Id, CustomerName = customer1.FullName,
            VendorId = vendor7.Id, Rating = 5,
            Comment = "Niluka Photography captured our engagement shoot in Kandy and the results were beyond anything we imagined. Niluka has an incredible eye for light and composition. The Kandy Lake backdrop shots are simply gorgeous — we've already had family asking for copies. The turnaround was fast too, with a full edited gallery in less than a week. 10/10!",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-23),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX6.Id, CustomerId = customer2.Id, CustomerName = customer2.FullName,
            VendorId = vendor8.Id, Rating = 5,
            Comment = "Spice Route Catering made our baby shower a feast to remember. The seafood BBQ was outstanding and the live cooking station was a hit with every guest. The team from Negombo were punctual, cheerful, and meticulous about hygiene. The food was freshly prepared and the quality was restaurant-grade. Our guests are still asking for the catering contact!",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-31),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX7.Id, CustomerId = customer3.Id, CustomerName = customer3.FullName,
            VendorId = vendor9.Id, Rating = 5,
            Comment = "Enchanted Decor turned our wedding venue in Galle into something out of a fairy tale. The floral archway, the cascading fabric ceiling, and the illuminated table centrepieces were breathtaking. Sanduni's team worked with such precision and passion. Every guest complimented the decor and several asked for the vendor's contact on the day. Worth every rupee.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-40),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX8.Id, CustomerId = customer4.Id, CustomerName = customer4.FullName,
            VendorId = vendor11.Id, Rating = 4,
            Comment = "Sound Wave Entertainment delivered a fantastic performance at our corporate event in Gampaha. Hasitha and his band read the room perfectly, starting with smooth jazz during dinner and gradually building up to lively crowd-pleasers. The PA system was top quality — great sound even in the far corners of the hall. Would have given 5 stars if the setup hadn't started 30 minutes late.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-26),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX9.Id, CustomerId = customer1.Id, CustomerName = customer1.FullName,
            VendorId = vendor14.Id, Rating = 5,
            Comment = "Golden Spoon Catering made my mother's birthday party an absolute culinary celebration. The Ceylon curry buffet was simply outstanding — the curries were rich, fresh, and full of flavour. The presentation was beautiful and the service staff were polite and attentive. Several guests said it was the best food they'd eaten at any party. Will definitely use Golden Spoon for every future event.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-18),
        }, ct);

        await UpsertReviewAsync(reviews, new Review
        {
            Id = NewId(), BookingId = bX10.Id, CustomerId = customer2.Id, CustomerName = customer2.FullName,
            VendorId = vendor15.Id, Rating = 5,
            Comment = "Petal & Bloom turned our wedding reception into a garden paradise. The flower arrangements were lush, fragrant, and absolutely stunning in photos. Ishara personally oversaw the setup and her team's attention to detail was extraordinary. The bridal arch alone was worth the entire cost — our wedding photos look like magazine shoots. I cannot recommend them enough.",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-13),
        }, ct);

        // ── Notifications ──────────────────────────────────────────────────────
        await UpsertNotificationsAsync(notifications, [
            // Vendor1 (Chamara) — new booking request from Priya (b7, rejected later)
            new Notification { Id = NewId(), UserId = vendor1.Id, Type = NotificationType.BookingRequest,
                Title = "New booking request", Message = "Priya Nair has requested Event Photography for a Birthday Party.",
                RelatedBookingId = b7.Id, Read = true, CreatedAt = DateTimeOffset.UtcNow.AddDays(-3) },

            // Vendor5 (Kavindya) — new pending request from Sarah (b5)
            new Notification { Id = NewId(), UserId = vendor5.Id, Type = NotificationType.BookingRequest,
                Title = "New booking request", Message = "Sarah Fernando has requested Bridal Makeup for a Wedding.",
                RelatedBookingId = b5.Id, Read = false, CreatedAt = DateTimeOffset.UtcNow.AddDays(-1) },

            // Vendor6 (Asitha) — new pending request from James (b6)
            new Notification { Id = NewId(), UserId = vendor6.Id, Type = NotificationType.BookingRequest,
                Title = "New booking request", Message = "James Perera has requested Banquet Hall for a Wedding Reception.",
                RelatedBookingId = b6.Id, Read = false, CreatedAt = DateTimeOffset.UtcNow.AddHours(-6) },

            // Customer1 (Sarah) — booking accepted by Vendor3 through b3 (different customer but keep realistic)
            new Notification { Id = NewId(), UserId = customer3.Id, Type = NotificationType.BookingAccepted,
                Title = "Booking accepted", Message = "Bloom Decor has accepted your Stage Decoration booking.",
                RelatedBookingId = b3.Id, Read = true, CreatedAt = DateTimeOffset.UtcNow.AddDays(-5) },

            // Customer2 (James) — booking accepted
            new Notification { Id = NewId(), UserId = customer4.Id, Type = NotificationType.BookingAccepted,
                Title = "Booking accepted", Message = "Royal Bites Catering has accepted your Buffet Catering booking.",
                RelatedBookingId = b4.Id, Read = true, CreatedAt = DateTimeOffset.UtcNow.AddDays(-8) },

            // Customer3 (Priya) — booking rejected
            new Notification { Id = NewId(), UserId = customer3.Id, Type = NotificationType.BookingRejected,
                Title = "Booking not available", Message = "Lens & Light Photography is unavailable on your selected date.",
                RelatedBookingId = b7.Id, Read = false, CreatedAt = DateTimeOffset.UtcNow.AddDays(-2) },

            // Customer1 (Sarah) — review prompt after completed booking
            new Notification { Id = NewId(), UserId = customer1.Id, Type = NotificationType.ReviewPrompt,
                Title = "How was your event?", Message = "Your event with Lens & Light Photography is complete. Leave a review!",
                RelatedBookingId = b1.Id, Read = true, CreatedAt = DateTimeOffset.UtcNow.AddDays(-30) },

            // Customer2 (James) — review prompt
            new Notification { Id = NewId(), UserId = customer2.Id, Type = NotificationType.ReviewPrompt,
                Title = "How was your event?", Message = "Your event with Harmony Sounds is complete. Leave a review!",
                RelatedBookingId = b2.Id, Read = false, CreatedAt = DateTimeOffset.UtcNow.AddDays(-20) },

            // Vendor1 (Chamara) — received a 5-star review
            new Notification { Id = NewId(), UserId = vendor1.Id, Type = NotificationType.Message,
                Title = "New 5-star review!", Message = "Sarah Fernando left you a 5-star review.",
                Read = false, CreatedAt = DateTimeOffset.UtcNow.AddDays(-28) },

            // Vendor1 — vendor approval notification
            new Notification { Id = NewId(), UserId = vendor1.Id, Type = NotificationType.VendorApproved,
                Title = "Account approved", Message = "Your vendor account has been approved. You can now receive bookings.",
                Read = true, CreatedAt = DateTimeOffset.UtcNow.AddDays(-30) },
        ], ct);

        // ── Categories ────────────────────────────────────────────────────────
        var categories = db.GetCollection<Category>("categories");
        var defaultCategories = new[]
        {
            new Category { Id = "cat_photography", Name = "Photographers", Slug = "photography", Active = true },
            new Category { Id = "cat_catering",    Name = "Caterers",      Slug = "catering",    Active = true },
            new Category { Id = "cat_decoration",  Name = "Decorators",    Slug = "decoration",  Active = true },
            new Category { Id = "cat_venues",      Name = "Venues",        Slug = "venues",      Active = true },
            new Category { Id = "cat_music",       Name = "Musicians",     Slug = "music",       Active = true },
            new Category { Id = "cat_beauty",      Name = "Beauty & Makeup", Slug = "beauty",    Active = true },
        };

        foreach (var cat in defaultCategories)
        {
            var existingCat = await categories.Find(c => c.Id == cat.Id).FirstOrDefaultAsync(ct);
            if (existingCat is null)
            {
                cat.CreatedAt = DateTimeOffset.UtcNow;
                await categories.InsertOneAsync(cat, cancellationToken: ct);
            }
        }

        _logger.LogInformation(
            "Seed complete — 1 admin, 4 customers, 16 vendors (14 approved + 2 pending), 18 bookings, 12 reviews, 3 conversations, 10 notifications, 6 categories.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string NewId() => ObjectId.GenerateNewId().ToString();
    private static string Ago(int days)   => DateTimeOffset.UtcNow.AddDays(-days).ToString("yyyy-MM-dd");
    private static string Ahead(int days) => DateTimeOffset.UtcNow.AddDays(days).ToString("yyyy-MM-dd");

    private static List<AvailabilitySlot> AvailabilityFor(int futureDays)
    {
        var slots = new List<AvailabilitySlot>();
        for (int i = 1; i <= futureDays; i++)
        {
            var date = DateTimeOffset.UtcNow.AddDays(i);
            if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            {
                slots.Add(new AvailabilitySlot
                {
                    Date = date.ToString("yyyy-MM-dd"),
                    TimeSlots =
                    [
                        new TimeSlot { StartTime = "08:00", EndTime = "12:00" },
                        new TimeSlot { StartTime = "14:00", EndTime = "20:00" },
                    ]
                });
            }
        }
        return slots;
    }

    private static async Task EnsureIndexesAsync(
        IMongoCollection<User> users,
        IMongoCollection<Conversation> conversations,
        CancellationToken ct)
    {
        await users.Indexes.CreateOneAsync(
            new CreateIndexModel<User>(
                Builders<User>.IndexKeys.Ascending(u => u.Email),
                new CreateIndexOptions { Unique = true, Name = "ux_users_email" }),
            cancellationToken: ct);

        await conversations.Indexes.CreateOneAsync(
            new CreateIndexModel<Conversation>(
                Builders<Conversation>.IndexKeys.Ascending(c => c.CustomerId).Ascending(c => c.VendorId),
                new CreateIndexOptions { Unique = true, Name = "ux_conversations_participants" }),
            cancellationToken: ct);
    }

    private static async Task<User> UpsertUserAsync(IMongoCollection<User> col, User seed, CancellationToken ct)
    {
        var email = (seed.Email ?? string.Empty).Trim().ToLowerInvariant();
        var existing = await col.Find(u => u.Email == email).FirstOrDefaultAsync(ct);

        if (existing is not null)
        {
            // Refresh mutable vendor fields so re-runs pick up photo/description updates.
            if (existing.Role == UserRole.Vendor)
            {
                var update = Builders<User>.Update
                    .Set(u => u.Photos, seed.Photos)
                    .Set(u => u.Description, seed.Description)
                    .Set(u => u.Services, seed.Services)
                    .Set(u => u.Pricing, seed.Pricing)
                    .Set(u => u.PriceMin, seed.PriceMin)
                    .Set(u => u.PriceMax, seed.PriceMax)
                    .Set(u => u.Experience, seed.Experience)
                    .Set(u => u.BusinessName, seed.BusinessName)
                    .Set(u => u.Category, seed.Category)
                    .Set(u => u.Location, seed.Location)
                    .Set(u => u.Availability, seed.Availability)
                    .Set(u => u.UpdatedAt, DateTimeOffset.UtcNow);
                await col.UpdateOneAsync(u => u.Id == existing.Id, update, cancellationToken: ct);
                existing.Photos       = seed.Photos;
                existing.Description  = seed.Description;
                existing.Services     = seed.Services;
                existing.Pricing      = seed.Pricing;
                existing.PriceMin     = seed.PriceMin;
                existing.PriceMax     = seed.PriceMax;
                existing.Availability = seed.Availability;
            }
            return existing;
        }

        seed.Id        = string.IsNullOrWhiteSpace(seed.Id) ? NewId() : seed.Id;
        seed.Email     = email;
        seed.CreatedAt = DateTimeOffset.UtcNow;
        seed.UpdatedAt = DateTimeOffset.UtcNow;
        await col.InsertOneAsync(seed, cancellationToken: ct);
        return seed;
    }

    private static async Task<Booking> UpsertBookingAsync(IMongoCollection<Booking> col, Booking seed, CancellationToken ct)
    {
        var existing = await col
            .Find(b => b.CustomerId == seed.CustomerId && b.VendorId == seed.VendorId && b.EventDate == seed.EventDate)
            .FirstOrDefaultAsync(ct);
        if (existing is not null) return existing;

        await col.InsertOneAsync(seed, cancellationToken: ct);
        return seed;
    }

    private static async Task<Conversation> UpsertConversationAsync(IMongoCollection<Conversation> col, Conversation seed, CancellationToken ct)
    {
        var existing = await col
            .Find(c => c.CustomerId == seed.CustomerId && c.VendorId == seed.VendorId)
            .FirstOrDefaultAsync(ct);
        if (existing is not null) return existing;

        await col.InsertOneAsync(seed, cancellationToken: ct);
        return seed;
    }

    private static async Task UpsertMessagesAsync(
        IMongoCollection<BookingMessage> col,
        string convId,
        List<(string senderId, string senderName, string receiverId, string content, DateTimeOffset timestamp)> msgs,
        CancellationToken ct)
    {
        var count = await col.CountDocumentsAsync(m => m.ConversationId == convId, cancellationToken: ct);
        if (count > 0) return;

        var docs = msgs.Select(m => new BookingMessage
        {
            Id             = NewId(),
            ConversationId = convId,
            SenderId       = m.senderId,
            SenderName     = m.senderName,
            ReceiverId     = m.receiverId,
            Content        = m.content,
            Timestamp      = m.timestamp,
            Read           = true,
        }).ToList();

        await col.InsertManyAsync(docs, cancellationToken: ct);
    }

    private static async Task UpsertReviewAsync(IMongoCollection<Review> col, Review seed, CancellationToken ct)
    {
        var existing = await col.Find(r => r.BookingId == seed.BookingId).FirstOrDefaultAsync(ct);
        if (existing is not null) return;

        await col.InsertOneAsync(seed, cancellationToken: ct);
    }

    private static async Task UpsertNotificationsAsync(IMongoCollection<Notification> col, List<Notification> seeds, CancellationToken ct)
    {
        foreach (var n in seeds)
        {
            // Deduplicate by (UserId, Type, RelatedBookingId) so re-runs don't add duplicates.
            var filter = Builders<Notification>.Filter.And(
                Builders<Notification>.Filter.Eq(x => x.UserId, n.UserId),
                Builders<Notification>.Filter.Eq(x => x.Type, n.Type),
                Builders<Notification>.Filter.Eq(x => x.RelatedBookingId, n.RelatedBookingId));

            var existing = await col.Find(filter).FirstOrDefaultAsync(ct);
            if (existing is not null) continue;

            await col.InsertOneAsync(n, cancellationToken: ct);
        }
    }
}
