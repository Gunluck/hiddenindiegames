// scrapeGames.js - JavaScript equivalent of scrape.py

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const url = 'https://itch.io/games/newest';
const affiliateCode = '?ac=Z9K3Bm97mhHDp'; // Your affiliate code
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const GAMES_FILE = 'games.json';

// Ensure the games.json file exists
function ensureGamesFile() {
  if (!fs.existsSync(GAMES_FILE)) {
    try {
      fs.writeFileSync(GAMES_FILE, JSON.stringify([], null, 2), 'utf-8');
      console.log('✅ Created new games.json file');
    } catch (err) {
      console.error('❌ Failed to create games.json:', err.message);
    }
  }
}

function addAffiliate(link) {
  if (!link) return '';
  return link.includes('?') ? link + '&ac=Z9K3Bm97mhHDp' : link + affiliateCode;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 10000 // 10 second timeout
      });
    } catch (err) {
      console.error(`Attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) throw err;
      await delay(RETRY_DELAY);
    }
  }
}

async function readExistingGames() {
  try {
    ensureGamesFile();
    const data = fs.readFileSync(GAMES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.warn('Warning: Could not read existing games:', err.message);
    return [];
  }
}

async function saveGames(games) {
  try {
    ensureGamesFile();
    fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), 'utf-8');
    console.log(`✅ Successfully saved ${games.length} games to ${GAMES_FILE}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to save games:', err.message);
    return false;
  }
}

async function scrapeGames() {
  try {
    // First, ensure games file exists and try to read existing games as backup
    const existingGames = await readExistingGames();

    // Fetch and parse the page
    const { data } = await fetchWithRetry(url);
    const $ = cheerio.load(data);
    const games = [];

    $('div.game_cell').slice(0, 10).each((i, el) => {
      try {
        const linkTag = $(el).find('a.title');
        const title = linkTag.text().trim();
        let href = linkTag.attr('href') || '';
        
        // Skip if we couldn't get a title or href
        if (!title || !href) {
          console.warn(`Skipping game ${i + 1} due to missing title or link`);
          return;
        }

        let fullLink = href.startsWith('http') ? href : `https://itch.io${href}`;
        const fullLinkWithAffiliate = addAffiliate(fullLink);
        const description = 'Discover a new indie gem!';

        games.push({
          title,
          description,
          link: fullLinkWithAffiliate
        });
      } catch (err) {
        console.warn(`Error processing game ${i + 1}:`, err.message);
      }
    });

    // Validate we got some games
    if (games.length === 0) {
      console.warn('No games were scraped! Using existing games as fallback.');
      if (existingGames.length > 0) {
        console.log('Using existing games as fallback');
        return;
      }
      throw new Error('No games could be scraped and no backup available');
    }

    // Save the new games
    await saveGames(games);
  } catch (err) {
    console.error('❌ Error scraping games:', err.message);
    // If scraping failed and we have existing games, keep using them
    if (existingGames && existingGames.length > 0) {
      console.log('Keeping existing games due to scraping failure');
      return;
    }
    throw err; // Re-throw if we have no fallback
  }
}

// Run the scraper
scrapeGames().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
