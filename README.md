# 🎮 Hidden Indie Games Bot

A robust, private Discord bot that helps servers discover indie games and anime. Features a secure server approval system, daily game recommendations with images, personalized wishlists, and anime search powered by the Jikan API. Data is persistently stored using MongoDB Atlas.

> **Discord:** [discord.gg/kbesv7EF](https://discord.gg/kbesv7EF) | **GitHub:** [github.com/Gunluck](https://github.com/Gunluck)

---

## ✨ Features

- **MongoDB Persistence:** All server approvals, user wishlists, and usage history are safely saved to MongoDB.
- **Personalized Wishlists:** Users can easily save games they discover to a personal, viewable wishlist.
- **Anime Search:** Connects to MyAnimeList via the Jikan API to find specific anime info instantly.
- **Interactive UI:** Features embed images and interactive "Next/Previous" button pagination for game lists.
- **Anti-Spam Security:** Built-in 5-second rate limits on all commands.
- **Admin Broadcasts:** The bot owner can instantly send announcements to all approved servers.

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v16.9.0 or higher
- npm
- A Discord Bot Token
- A Free MongoDB Atlas Cluster URI
- Your Discord User ID

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure `.env`
Create a `.env` file in the root folder with the following variables:
```env
BOT_TOKEN=your_discord_bot_token
OWNER_ID=your_discord_user_id
CHANNEL_ID=your_announcement_channel_id
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/discord-bot
```

### 3. Start the Bot
```bash
npm start        # Production (Render)
npm run dev      # Development (nodemon, auto-restart)
```

---

## 🤖 Commands

### Public Commands
| Command | Description |
|---|---|
| `/game` | Get a random indie game recommendation (with image thumbnail) |
| `/daily` | See today's featured game (refreshes daily) |
| `/top` | View top 10 trending games using interactive pagination buttons |
| `/search [term]` | Search for games by name or description |
| `/wishlist add [title]` | Save a game to your personal wishlist |
| `/wishlist view` | View your saved games |
| `/wishlist remove [title]` | Remove a game from your wishlist |
| `/anime` | Get a random anime recommendation |
| `/animesearch [name]` | Search MyAnimeList for a specific anime |
| `/stats` | View bot statistics (Total games shared, anime shared, etc.) |
| `/help` | Show all available commands |
| `/about` | Learn about the bot |

### Owner-Only Commands (Admin)
| Command | Description |
|---|---|
| `/approve [server_id]` | Approve a server to use the bot |
| `/deny [server_id]` | Deny a server and leave it |
| `/pending` | View all pending server requests |
| `/servers` | List all approved servers |
| `/broadcast [msg]` | Send an announcement to all approved servers |
| `/removeserver [id]` | Forcefully remove a server from the database |

> *Note: All commands have a 5-second rate limit to prevent spam, which the Owner bypasses.*

---

## 🔒 Server Approval System

When someone adds the bot to a new server:
1. Bot owner gets a **DM** with the server's details
2. The server sees an "awaiting approval" message
3. Owner uses `/approve` or `/deny` to respond
4. Request **auto-denies after 24 hours** if ignored

---

## 🌐 Hosting (Render / Keep-Alive)

The bot includes `keepalive.js` — an Express web server that:
- Serves a status page at the root URL
- Keeps the bot awake on free-tier platforms like Render
- Can be pinged by uptime monitoring services (e.g. UptimeRobot)

Set the `PORT` env variable if needed (defaults to `10000`).

---

## 🗂️ File Structure

```
discord/
├── db.js                 # MongoDB connection and Mongoose Schemas
├── index.js              # Main bot entry point / Command Handlers
├── gameLoader.js         # Loads/reloads games from games.json
├── scrapeGames.js        # Scrapes itch.io for new indie games + thumbnails
├── keepalive.js          # Express server for keep-alive on Render
├── games.json            # Cached itch.io game data (auto-generated)
├── .env                  # Secret tokens and config (never commit!)
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

---

## 🚀 Roadmap

### Phase 1 — Enhanced Game Features
- Game categories/tags (Action, RPG, Adventure...)
- User preference & personalized recommendations
- Rating & review system

### Phase 2 — Advanced Anime Features
- Genre-based recommendations
- Seasonal anime tracking
- Episode notifications

### Phase 3 — Community / Gamification
- Server-specific rankings & events
- Leveling / XP System (Titles for heavy users)
- Game of the Month voting

---

## ⚖️ License & Terms

This is proprietary software. All rights reserved. See [LICENSE](LICENSE) for details.

- One license per Discord server
- Licenses are non-transferable
- Must comply with Discord's Terms of Service
- Unauthorized use is strictly prohibited

For licensing: join [discord.gg/kbesv7EF](https://discord.gg/kbesv7EF) or contact via GitHub.