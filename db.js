const mongoose = require('mongoose');

// Connect to MongoDB Atlas
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'discord-bot'
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// ── Schemas ─────────────────────────────────────────────

// Approved servers
const allowedServerSchema = new mongoose.Schema({
  serverId: { type: String, required: true, unique: true }
});

// Used games and anime (type = 'game' | 'anime')
const usedItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type:  { type: String, required: true, enum: ['game', 'anime'] }
});
usedItemSchema.index({ title: 1, type: 1 }, { unique: true });

// Singleton post stats doc
const postStatsSchema = new mongoose.Schema({
  gameCount:  { type: Number, default: 0 },
  animeCount: { type: Number, default: 0 }
});

// ── Models ───────────────────────────────────────────────
const AllowedServer = mongoose.model('AllowedServer', allowedServerSchema);
const UsedItem      = mongoose.model('UsedItem',      usedItemSchema);
const PostStats     = mongoose.model('PostStats',     postStatsSchema);

// ── Helper: get or create the singleton stats doc ────────
async function getStats() {
  let stats = await PostStats.findOne();
  if (!stats) stats = await PostStats.create({ gameCount: 0, animeCount: 0 });
  return stats;
}

module.exports = { connectDB, AllowedServer, UsedItem, PostStats, getStats };
