const fs = require('fs');
const { exec } = require('child_process');

// Initialize games array
let games = [];

async function loadGames() {
  try {
    if (!fs.existsSync('games.json')) {
      console.log('⚠️ games.json not found, triggering scrape...');
      await new Promise((resolve, reject) => {
        exec('node scrapeGames.js', (err, stdout, stderr) => {
          if (err) {
            console.error('❌ Error running scraper:', err);
            reject(err);
            return;
          }
          console.log(stdout); // Log scraper output
          resolve();
        });
      });
    }

    // Read the games.json file
    const data = fs.readFileSync('games.json', 'utf-8');
    games = JSON.parse(data);
    
    if (!Array.isArray(games)) {
      throw new Error('games.json does not contain an array');
    }

    console.log(`✅ Loaded ${games.length} games from games.json`);
    return games;
  } catch (err) {
    console.error('❌ Error loading games:', err.message);
    games = []; // Reset to empty array on error
    return games;
  }
}

async function reloadGames() {
  try {
    console.log('🔄 Reloading games...');
    await new Promise((resolve, reject) => {
      exec('node scrapeGames.js', (err, stdout, stderr) => {
        if (err) {
          console.error('❌ Error running scraper:', err);
          reject(err);
          return;
        }
        console.log(stdout); // Log scraper output
        resolve();
      });
    });

    // Read the newly scraped games
    const data = fs.readFileSync('games.json', 'utf-8');
    games = JSON.parse(data);
    
    if (!Array.isArray(games)) {
      throw new Error('games.json does not contain an array');
    }

    console.log(`✅ Reloaded ${games.length} games successfully`);
    return games;
  } catch (err) {
    console.error('❌ Error reloading games:', err.message);
    // Don't reset games array on reload error - keep existing games
    throw err;
  }
}

// Export both the functions and the games array
module.exports = {
  loadGames,
  reloadGames,
  getGames: () => games, // Function to get current games
  get games() { return games; } // Getter for games array
};
