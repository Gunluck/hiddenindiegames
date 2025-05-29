// HiddenIndieGamesBot (Discord Version)
// Description: Posts a daily hidden indie game with an affiliate link

const { Client, Events, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const schedule = require('node-schedule');
require('dotenv').config();

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// Load game data from JSON
let games = JSON.parse(fs.readFileSync('games.json'));
let index = 0;

client.once('ready', () => {
  console.log(`Bot is online as ${client.user.tag}`);

  // (minute) (hour) (day of month) (month) (day of week)
  // Schedule daily post at 10:00 AM
  schedule.scheduleJob('0 10 * * *', () => {
    postDailyGame();
  });
});

// Handle message commands



client.on('messageCreate', message => {
  if (message.author.bot) return;

  // Check for game command
  if (message.content === '!game') {
    const randomGame = games[Math.floor(Math.random() * games.length)];
    const reply = `🎮 **${randomGame.title}**\n${randomGame.description}\n🔗 ${randomGame.link}`;
    message.channel.send(reply);
  }

  // Check if bot is mentioned
  if (message.mentions.has(client.user)) {
    const content = message.content.toLowerCase();
    
    // Different responses based on the message content
    if (content.includes('hi') || content.includes('hello')) {
      message.reply('👋 Hello! How can I help you today?');
    } else if (content.includes('help')) {
      message.reply('I can help you discover games! Try using `!game` to get a random game recommendation.');
    } else {
      message.reply('Hey there! You can use `!game` to get a random game recommendation!');
    }
  }
});

function postDailyGame() {
  const game = games[index];
  const channel = client.channels.cache.get(process.env.CHANNEL_ID);

  if (!channel || !game) return;

  const message = `🎮 **${game.title}**\n${game.description}\n🔗 ${game.link}`;
  channel.send(message);

  index = (index + 1) % games.length; // Loop back after last game
}

// Use environment variable for token instead of hardcoding
client.login(process.env.BOT_TOKEN);
