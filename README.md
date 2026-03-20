# 🎮 Hidden Indie Games Bot

A private Discord bot that helps servers discover indie games and anime. Features a server approval system, daily game recommendations, and anime suggestions powered by the Jikan/MAL API.

> **Discord:** [discord.gg/kbesv7EF](https://discord.gg/kbesv7EF) | **GitHub:** [github.com/Gunluck](https://github.com/Gunluck)

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v16.9.0 or higher
- npm
- A Discord Bot Token
- Your Discord User ID

### 1. Install Dependencies
```bash
npm install
```

> ⚠️ **Note:** `cheerio` is used by `scrapeGames.js` but is missing from `package.json`. Run:
> ```bash
> npm install cheerio
> ```

### 2. Configure `.env`
Create a `.env` file in the root folder:
```env
BOT_TOKEN=your_discord_bot_token
OWNER_ID=your_discord_user_id
CHANNEL_ID=your_announcement_channel_id
ALLOWED_SERVERS=server_id_1,server_id_2
```

### 3. Start the Bot
```bash
npm start        # Production
npm run dev      # Development (nodemon, auto-restart)
```

---

## 🔍 How to Find Discord IDs

1. Open Discord → ⚙️ Settings → **Advanced** → Enable **Developer Mode**
2. Then right-click on any user, server, or channel → **Copy ID**

| Variable | How to Get It |
|---|---|
| `OWNER_ID` | Right-click your username → Copy ID |
| `CHANNEL_ID` | Right-click the announcement channel → Copy ID |
| `ALLOWED_SERVERS` | Right-click the server icon → Copy ID (comma-separated for multiple) |

> IDs are 18-digit numbers. Never share your `.env` file publicly.

---

## 🤖 Commands

### Public Commands
| Command | Description |
|---|---|
| `/game` | Get a random indie game recommendation |
| `/daily` | See today's featured game |
| `/top` | View top 3 trending games |
| `/search [term]` | Search for games by name or description |
| `/anime` | Get a random anime recommendation |
| `/stats` | View bot statistics |
| `/help` | Show all available commands |
| `/about` | Learn about the bot |

### Owner-Only Commands
| Command | Description |
|---|---|
| `/approve [server_id]` | Approve a server to use the bot |
| `/deny [server_id]` | Deny a server and leave it |
| `/pending` | View all pending server requests |
| `/servers` | List all approved servers |

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
- Keeps the bot alive on free-tier platforms like Render
- Can be pinged by uptime monitoring services (e.g. UptimeRobot)

Set the `PORT` env variable if needed (defaults to `3000`).

---

## 🗂️ File Structure

```
discord/
├── index.js              # Main bot entry point
├── gameLoader.js         # Loads/reloads games from games.json
├── scrapeGames.js        # Scrapes itch.io for new indie games
├── keepalive.js          # Express server for keep-alive on Render
├── games.json            # Cached game data (auto-generated)
├── usedGames.json        # Tracks shown games (avoids repeats)
├── usedAnime.json        # Tracks shown anime (avoids repeats)
├── postStats.json        # Tracks total game/anime post counts
├── .env                  # Secret tokens and config (never commit!)
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

> `allowedServers.json` is auto-created at runtime when the first server is approved.

---

## 🔧 Channel Permission Recommendations

| Channel | @everyone | @moderator |
|---|---|---|
| `#gaming-chat` | View, Send, React, Read History | + Manage Messages, Pin, Mention @everyone |
| `#game-reviews` | View, Send, React, Read History | + Manage Messages, Pin, Threads |
| `#general` | View, Send, React, Read History | + Manage Messages, Pin, Mention @everyone |

**Bot role needs:** Send Messages, Embed Links, Read Message History, Add Reactions, Use External Emojis

**Security tips:**
- Enable slow mode on `#game-reviews` (5–10 min recommended)
- Set up AutoMod for content filtering
- Enable 2FA requirement for moderators

---

## 🚀 Roadmap

### Phase 1 — Enhanced Game Features
- Game categories/tags (Action, RPG, Adventure...)
- User preference & personalized recommendations
- Rating & review system
- Price tracking & sale alerts

### Phase 2 — Advanced Anime Features
- Genre-based recommendations
- Seasonal anime tracking
- Personal watchlist & episode notifications

### Phase 3 — Community Features
- Server-specific rankings & events
- Achievement & reputation system
- Game of the Month voting

### Phase 4+ — Technical & Platform
- Caching & database optimization
- Steam / IGDB / MAL API integration
- Web dashboard & analytics
- Auto-moderation tools

---

## ⚖️ License & Terms

This is proprietary software. All rights reserved. See [LICENSE](LICENSE) for details.

- One license per Discord server
- Licenses are non-transferable
- Must comply with Discord's Terms of Service
- Unauthorized use is strictly prohibited

For licensing: join [discord.gg/kbesv7EF](https://discord.gg/kbesv7EF) or contact via GitHub.