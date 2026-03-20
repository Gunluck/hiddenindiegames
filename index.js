const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const schedule = require('node-schedule');
const axios = require('axios');

require('dotenv').config();

// Connect to MongoDB
const { connectDB, AllowedServer, UsedItem, PostStats, getStats, Wishlist } = require('./db');
connectDB();

// Keep the bot alive on Render
require('./keepalive');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const { reloadGames, loadGames, getGames } = require('./gameLoader');

// Owner ID
const OWNER_ID = process.env.OWNER_ID;
const pendingServers = new Map();

// ── Slash commands definition ────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('game')
    .setDescription('Get a random indie game recommendation'),
  new SlashCommandBuilder()
    .setName('daily')
    .setDescription('See today\'s featured game'),
  new SlashCommandBuilder()
    .setName('top')
    .setDescription('View top 3 trending games'),
  new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for games by name or description')
    .addStringOption(option =>
      option.setName('term')
        .setDescription('Search term')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Get an anime recommendation'),
  new SlashCommandBuilder()
    .setName('animesearch')
    .setDescription('Search for a specific anime via MyAnimeList')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the anime')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View bot statistics'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),
  new SlashCommandBuilder()
    .setName('about')
    .setDescription('Learn about the bot'),
  new SlashCommandBuilder()
    .setName('wishlist')
    .setDescription('Manage your personal game wishlist')
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a game to your wishlist')
      .addStringOption(opt => opt.setName('title').setDescription('Game title').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('view')
      .setDescription('View your saved wishlist games')
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a game from your wishlist')
      .addStringOption(opt => opt.setName('title').setDescription('Game title').setRequired(true))
    ),
  new SlashCommandBuilder()
    .setName('approve')
    .setDescription('(Owner Only) Approve a server')
    .addStringOption(option =>
      option.setName('server_id')
        .setDescription('The ID of the server to approve')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('deny')
    .setDescription('(Owner Only) Deny a server')
    .addStringOption(option =>
      option.setName('server_id')
        .setDescription('The ID of the server to deny')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('pending')
    .setDescription('(Owner Only) View pending server requests'),
  new SlashCommandBuilder()
    .setName('servers')
    .setDescription('(Owner Only) View all approved servers'),
  new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('(Owner Only) Send a message to all approved servers')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to broadcast')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('removeserver')
    .setDescription('(Owner Only) Remove an approved server')
    .addStringOption(option =>
      option.setName('server_id')
        .setDescription('The ID of the server to remove')
        .setRequired(true))
];

// ── Bot Ready ────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`Bot is online as ${client.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

    const loadedGames = await loadGames();
    if (!loadedGames || loadedGames.length === 0) {
      await reloadGames();
    }

    // Schedule daily game post at 10:00 AM
    schedule.scheduleJob('0 10 * * *', async () => {
      try {
        await postDailyGame();
      } catch (err) {
        console.error('Error in daily game post:', err);
      }
    });
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

// ── Server Join Handler ──────────────────────────────────
client.on('guildCreate', async (guild) => {
  const allowed = await AllowedServer.findOne({ serverId: guild.id });
  if (allowed) {
    console.log(`✅ Bot joined pre-approved server: ${guild.name}`);
    return;
  }

  console.log(`⚠️ Bot added to new server: ${guild.name}`);

  const serverOwner = await guild.fetchOwner();
  console.log(`👑 Server Owner: ${serverOwner.user.tag}`);

  try {
    const botOwner = await client.users.fetch(OWNER_ID);
    if (!botOwner) {
      console.error('❌ Bot owner not found! Check OWNER_ID in .env');
      await guild.leave();
      return;
    }

    const approvalEmbed = new EmbedBuilder()
      .setTitle('🔐 New Server Join Request')
      .setColor('#ff9900')
      .setDescription('A server wants to add your bot!')
      .addFields(
        { name: '📋 Server Name', value: guild.name, inline: true },
        { name: '🆔 Server ID', value: guild.id, inline: true },
        { name: '👥 Member Count', value: guild.memberCount.toString(), inline: true },
        { name: '👑 Server Owner', value: `${serverOwner.user.tag} (${serverOwner.id})`, inline: true },
        { name: '📅 Server Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: 'Use /approve or /deny followed by the server ID to respond' })
      .setTimestamp();

    pendingServers.set(guild.id, {
      name: guild.name,
      ownerId: serverOwner.id,
      ownerTag: serverOwner.user.tag,
      requestTime: Date.now()
    });

    await botOwner.send({ embeds: [approvalEmbed] });

    const defaultChannel = guild.channels.cache.find(
      channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
    );

    if (defaultChannel) {
      const waitingEmbed = new EmbedBuilder()
        .setTitle('⏳ Awaiting Approval')
        .setColor('#ff9900')
        .setDescription('This bot requires manual approval from its owner.')
        .addFields(
          { name: '⌛ What\'s Next?', value: 'Please wait for the bot owner to review your request.' },
          { name: '❓ Why?', value: 'This is a private bot that requires authorization for security reasons.' }
        )
        .setFooter({ text: 'The bot will automatically leave if not approved within 24 hours' })
        .setTimestamp();

      await defaultChannel.send({ embeds: [waitingEmbed] });
    }

    // Auto-deny after 24 hours
    setTimeout(async () => {
      if (pendingServers.has(guild.id)) {
        pendingServers.delete(guild.id);
        try {
          await guild.leave();
          await botOwner.send(`⏰ Auto-denied server "${guild.name}" (${guild.id}) due to timeout`);
        } catch (err) {
          console.error('Error in timeout handling:', err);
        }
      }
    }, 24 * 60 * 60 * 1000);

  } catch (err) {
    console.error('Error in server join handling:', err);
    await guild.leave();
  }
});

// ── Slash Command Handler ────────────────────────────────
const cooldowns = new Map();
const COOLDOWN_SECONDS = 5;

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // Rate Limiting (Bypass for owner)
  if (interaction.user.id !== OWNER_ID) {
    if (!cooldowns.has(commandName)) {
      cooldowns.set(commandName, new Map());
    }
    const timestamps = cooldowns.get(commandName);
    const now = Date.now();
    const cooldownAmount = COOLDOWN_SECONDS * 1000;

    if (timestamps.has(interaction.user.id)) {
      const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
        return interaction.reply({ content: `⏳ Please wait ${timeLeft} more seconds before using \`/${commandName}\` again.`, ephemeral: true });
      }
    }
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
  }

  try {
    if (['approve', 'deny', 'pending', 'servers', 'broadcast', 'removeserver'].includes(commandName)) {
      if (interaction.user.id !== OWNER_ID) {
        await interaction.reply({ content: '❌ This command is only available to the bot owner.', ephemeral: true });
        return;
      }
    }

    switch (commandName) {
      case 'game':  await handleGameCommand(interaction, true);   break;
      case 'daily': await handleDailyCommand(interaction, true);  break;
      case 'top':   await handleTopCommand(interaction, true);    break;
      case 'search':await handleSearchCommand(interaction, true); break;
      case 'anime': await handleAnimeCommand(interaction, true);  break;
      case 'animesearch': await handleAnimeSearchCommand(interaction, true); break;
      case 'stats': await handleStatsCommand(interaction, true);  break;
      case 'help':  await handleHelpCommand(interaction, true);   break;
      case 'about': await handleAboutCommand(interaction);        break;
      case 'wishlist': await handleWishlistCommand(interaction, true); break;

      case 'approve': {
        const serverId = interaction.options.getString('server_id');
        const pendingServer = pendingServers.get(serverId);

        if (!pendingServer) {
          await interaction.reply({ content: '❌ No pending request found for this server', ephemeral: true });
          return;
        }

        // Save to MongoDB
        await AllowedServer.findOneAndUpdate(
          { serverId },
          { serverId },
          { upsert: true, new: true }
        );
        pendingServers.delete(serverId);

        await interaction.reply(`✅ Approved server: ${pendingServer.name}`);

        const guild = client.guilds.cache.get(serverId);
        if (guild) {
          const defaultChannel = guild.channels.cache.find(
            channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
          );
          if (defaultChannel) {
            const approvedEmbed = new EmbedBuilder()
              .setTitle('✅ Access Granted!')
              .setColor('#00ff00')
              .setDescription('Your server has been approved! You now have full access to the bot.')
              .addFields({ name: '📚 Get Started', value: 'Use `/help` to see all available commands' })
              .setTimestamp();
            await defaultChannel.send({ embeds: [approvedEmbed] });
          }
        }
        break;
      }

      case 'deny': {
        const serverId = interaction.options.getString('server_id');
        const pendingServer = pendingServers.get(serverId);

        if (!pendingServer) {
          await interaction.reply({ content: '❌ No pending request found for this server', ephemeral: true });
          return;
        }

        pendingServers.delete(serverId);

        const guild = client.guilds.cache.get(serverId);
        if (guild) {
          const defaultChannel = guild.channels.cache.find(
            channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
          );
          if (defaultChannel) {
            await defaultChannel.send('❌ Bot access request was denied by the owner. The bot will now leave the server.');
          }
          await guild.leave();
        }

        await interaction.reply(`✅ Denied and left server: ${pendingServer.name}`);
        break;
      }

      case 'pending': {
        if (pendingServers.size === 0) {
          await interaction.reply({ content: 'No pending server requests.', ephemeral: true });
          return;
        }

        const pendingEmbed = new EmbedBuilder()
          .setTitle('🔄 Pending Server Requests')
          .setColor('#ff9900')
          .setDescription('Here are the servers waiting for approval:');

        for (const [id, server] of pendingServers) {
          pendingEmbed.addFields({
            name: server.name,
            value: `ID: ${id}\nOwner: ${server.ownerTag}\nRequested: <t:${Math.floor(server.requestTime / 1000)}:R>`
          });
        }

        await interaction.reply({ embeds: [pendingEmbed], ephemeral: true });
        break;
      }

      case 'servers': {
        const approvedServers = await AllowedServer.find();
        const serversEmbed = new EmbedBuilder()
          .setTitle('🌐 Approved Servers')
          .setColor('#00ff00')
          .setDescription(`Total approved: ${approvedServers.length}`);

        for (const doc of approvedServers) {
          const guild = client.guilds.cache.get(doc.serverId);
          if (guild) {
            serversEmbed.addFields({
              name: guild.name,
              value: `ID: ${guild.id}\nMembers: ${guild.memberCount}`
            });
          } else {
            serversEmbed.addFields({
              name: 'Unknown Server',
              value: `ID: ${doc.serverId}`
            });
          }
        }

        await interaction.reply({ embeds: [serversEmbed], ephemeral: true });
        break;
      }

      case 'broadcast': {
        const message = interaction.options.getString('message');
        const approvedServers = await AllowedServer.find();
        let successCount = 0;
        let failCount = 0;

        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle('📢 Developer Announcement')
          .setColor('#ffcc00')
          .setDescription(message)
          .setFooter({ text: 'This message was sent by the bot owner to all approved servers.' })
          .setTimestamp();

        for (const doc of approvedServers) {
          const guild = client.guilds.cache.get(doc.serverId);
          if (guild) {
            const defaultChannel = guild.channels.cache.find(
              channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
            );
            if (defaultChannel) {
              try {
                await defaultChannel.send({ embeds: [embed] });
                successCount++;
              } catch (e) {
                failCount++;
              }
            } else {
              failCount++;
            }
          } else {
            failCount++;
          }
        }

        await interaction.editReply({ content: `✅ Broadcast complete! Successfully sent to **${successCount}** servers (Failed: ${failCount}).` });
        break;
      }

      case 'removeserver': {
        const serverId = interaction.options.getString('server_id');
        const result = await AllowedServer.deleteOne({ serverId });
        
        if (result.deletedCount === 0) {
          await interaction.reply({ content: `❌ Server **${serverId}** not found in the approved list.`, ephemeral: true });
          return;
        }

        const guild = client.guilds.cache.get(serverId);
        if (guild) {
          const defaultChannel = guild.channels.cache.find(
            channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
          );
          if (defaultChannel) {
            try {
              await defaultChannel.send('❌ This server has been removed from the approved list by the developer. The bot will now leave.');
            } catch (e) {}
          }
          await guild.leave();
        }

        await interaction.reply({ content: `✅ Server **${serverId}** removed from database. Bot has left (if it was still in the server).`, ephemeral: true });
        break;
      }
    }
  } catch (error) {
    console.error('Error handling command:', error);
    try {
      const reply = interaction.replied ? interaction.followUp : interaction.reply;
      await reply({ content: '❌ An error occurred while processing your command.', ephemeral: true });
    } catch (err) {
      console.error('Error sending error message:', err);
    }
  }
});

// ── Constants ────────────────────────────────────────────
const AFFILIATE_CODE = "?ac=Z9K3Bm97mhHDp";
const MAX_USE_BEFORE_REFRESH = 10;
let gameUseCount = 0;
let index = 0;

// ── Helper functions ─────────────────────────────────────
function addAffiliate(url) {
  if (!url) return '';
  if (!url.includes(AFFILIATE_CODE)) {
    return url.includes("?") ? url + "&ac=Z9K3Bm97mhHDp" : url + AFFILIATE_CODE;
  }
  return url;
}

async function saveUsedItem(title, type) {
  if (!title) return;
  try {
    await UsedItem.findOneAndUpdate(
      { title, type },
      { title, type },
      { upsert: true }
    );
    // Keep only last 500 per type
    const count = await UsedItem.countDocuments({ type });
    if (count > 500) {
      const oldest = await UsedItem.find({ type }).sort({ _id: 1 }).limit(count - 500);
      const ids = oldest.map(d => d._id);
      await UsedItem.deleteMany({ _id: { $in: ids } });
    }
  } catch (err) {
    console.error(`Error saving used ${type}:`, err.message);
  }
}

async function incrementStat(field) {
  try {
    await PostStats.findOneAndUpdate(
      {},
      { $inc: { [field]: 1 } },
      { upsert: true }
    );
  } catch (err) {
    console.error('Error updating stats:', err.message);
  }
}

// ── Command Handlers ─────────────────────────────────────
async function handleGameCommand(context, isSlash = false) {
  const games = getGames();
  if (!games?.length) {
    const response = '❌ No games available right now. Please try again later.';
    return isSlash ? context.reply(response) : context.channel.send(response);
  }

  const usedTitles = (await UsedItem.find({ type: 'game' })).map(d => d.title);
  let game = games.find(g => !usedTitles.includes(g.title)) || games[Math.floor(Math.random() * games.length)];

  const embed = new EmbedBuilder()
    .setTitle(game.title)
    .setColor('#ff6b6b')
    .setDescription(game.description)
    .addFields({ name: '🎮 Play Now', value: `[Click here to play](${addAffiliate(game.link)})` })
    .setFooter({ text: 'Use /daily to see today\'s featured game' })
    .setTimestamp();

  await (isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] }));
  await saveUsedItem(game.title, 'game');

  gameUseCount++;
  if (gameUseCount >= MAX_USE_BEFORE_REFRESH) {
    try {
      await reloadGames();
      gameUseCount = 0;
    } catch (err) {
      console.error('Failed to reload games:', err);
    }
  }
}

async function handleDailyCommand(context, isSlash = false) {
  const games = getGames();
  if (!games?.length) {
    const response = '❌ No games available right now.';
    return isSlash ? context.reply(response) : context.channel.send(response);
  }

  const game = games[index];
  const embed = new EmbedBuilder()
    .setTitle(`📅 Daily Pick: ${game.title}`)
    .setColor('#7289da')
    .setDescription(game.description)
    .addFields({ name: '🔗 Play Now', value: `[Click here](${addAffiliate(game.link)})` })
    .setTimestamp();

  await (isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] }));
  index = (index + 1) % games.length;
}

async function handleTopCommand(context, isSlash = false) {
  const games = getGames();
  if (!games?.length) {
    const response = '❌ No games available right now.';
    return isSlash ? context.reply(response) : context.channel.send(response);
  }

  const topGames = games.slice(0, 10); // Show up to 10 games
  let currentIndex = 0;

  const generateEmbed = (index) => {
    const game = topGames[index];
    return new EmbedBuilder()
      .setTitle(`🔥 Top Indie Games (#${index + 1} of ${topGames.length})`)
      .setColor('#ff9900')
      .addFields({ name: game.title, value: `${game.description}\n🔗 [Play Now](${addAffiliate(game.link)})` })
      .setFooter({ text: 'Use buttons to navigate' });
  };

  const generateButtons = (index) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_game')
        .setLabel('⬅️ Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === 0),
      new ButtonBuilder()
        .setCustomId('next_game')
        .setLabel('Next ➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === topGames.length - 1)
    );
  };

  const message = await (isSlash ?
    context.reply({ embeds: [generateEmbed(currentIndex)], components: [generateButtons(currentIndex)], fetchReply: true }) :
    context.channel.send({ embeds: [generateEmbed(currentIndex)], components: [generateButtons(currentIndex)] })
  );

  const collector = message.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async i => {
    if (i.user.id !== (isSlash ? context.user.id : context.author.id)) {
      await i.reply({ content: 'These buttons are not for you!', ephemeral: true });
      return;
    }
    if (i.customId === 'prev_game') currentIndex--;
    else if (i.customId === 'next_game') currentIndex++;
    
    await i.update({ embeds: [generateEmbed(currentIndex)], components: [generateButtons(currentIndex)] });
  });

  collector.on('end', async () => {
    try {
      await message.edit({ components: [] });
    } catch (e) {}
  });
}

async function handleSearchCommand(context, isSlash = false) {
  const searchTerm = isSlash ? context.options.getString('term') : context.content.slice(8);
  if (!searchTerm?.trim()) {
    const response = '❌ Please provide a search term.';
    return isSlash ? context.reply(response) : context.channel.send(response);
  }

  const games = getGames();
  const matchedGames = games.filter(game =>
    game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 3);

  if (!matchedGames.length) {
    const response = '❌ No games found matching your search term.';
    return isSlash ? context.reply(response) : context.channel.send(response);
  }

  const embed = new EmbedBuilder()
    .setTitle('🔍 Search Results')
    .setColor('#0099ff')
    .setDescription(`Found ${matchedGames.length} game(s) matching "**${searchTerm}**"`);

  matchedGames.forEach(game => {
    embed.addFields({
      name: game.title,
      value: `${game.description}\n🔗 [Play Now](${addAffiliate(game.link)})`
    });
  });

  await (isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] }));
}

async function handleAnimeCommand(context, isSlash = false) {
  try {
    const res = await axios.get('https://api.jikan.moe/v4/random/anime');
    const anime = res.data.data;

    const embed = new EmbedBuilder()
      .setTitle(anime.title)
      .setColor('#ff6b6b')
      .setDescription(anime.synopsis || 'No synopsis available.')
      .setThumbnail(anime.images?.jpg?.image_url || '')
      .addFields(
        { name: '📺 Watch Status', value: anime.status || 'Unknown', inline: true },
        { name: '⭐ Rating', value: anime.score ? `${anime.score}/10` : 'N/A', inline: true },
        { name: '🎭 Genres', value: anime.genres?.map(g => g.name).join(', ') || 'N/A' },
        { name: '🔗 More Info', value: `[View on MyAnimeList](${anime.url})` }
      );

    await (isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] }));
    await saveUsedItem(anime.title, 'anime');
    await incrementStat('animeCount');
  } catch (err) {
    console.error('Error fetching anime:', err);
    const response = '❌ Failed to fetch anime. Please try again later.';
    await (isSlash ? context.reply(response) : context.channel.send(response));
  }
}

async function handleAnimeSearchCommand(context, isSlash = false) {
  const searchTerm = isSlash ? context.options.getString('name') : context.content.slice(13);
  if (!searchTerm?.trim()) {
    const response = '❌ Please provide an anime name to search for.';
    return isSlash ? context.reply(response) : context.channel.send(response);
  }

  try {
    const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=1`);
    if (!res.data.data || res.data.data.length === 0) {
      const response = `❌ No anime found matching "**${searchTerm}**".`;
      return isSlash ? context.reply(response) : context.channel.send(response);
    }

    const anime = res.data.data[0];

    const embed = new EmbedBuilder()
      .setTitle(anime.title)
      .setColor('#ff6b6b')
      .setDescription(anime.synopsis ? (anime.synopsis.substring(0, 1000) + (anime.synopsis.length > 1000 ? '...' : '')) : 'No synopsis available.')
      .setThumbnail(anime.images?.jpg?.image_url || '')
      .addFields(
        { name: '📺 Watch Status', value: anime.status || 'Unknown', inline: true },
        { name: '⭐ Rating', value: anime.score ? `${anime.score}/10` : 'N/A', inline: true },
        { name: '🎭 Genres', value: anime.genres?.map(g => g.name).join(', ') || 'N/A' },
        { name: '🔗 More Info', value: `[View on MyAnimeList](${anime.url})` }
      );

    await (isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] }));
  } catch (err) {
    console.error('Error in animesearch:', err.message);
    const response = '❌ Failed to search for anime. The API might be busy.';
    await (isSlash ? context.reply({ content: response, ephemeral: true }) : context.channel.send(response));
  }
}

async function handleStatsCommand(context, isSlash = false) {
  const games = getGames();
  const stats = await getStats();
  const usedGamesCount = await UsedItem.countDocuments({ type: 'game' });
  const usedAnimeCount = await UsedItem.countDocuments({ type: 'anime' });

  const embed = new EmbedBuilder()
    .setTitle('📊 Bot Statistics')
    .setColor('#00ff00')
    .addFields(
      { name: 'Total Games',    value: `${games.length}`,     inline: true },
      { name: 'Games Shared',   value: `${usedGamesCount}`,   inline: true },
      { name: 'Anime Shared',   value: `${usedAnimeCount}`,   inline: true },
      { name: 'Channel Posts',  value: `${stats.gameCount}`,  inline: true },
      { name: 'Anime Posts',    value: `${stats.animeCount}`, inline: true }
    )
    .setFooter({ text: 'Use /help to see all commands' })
    .setTimestamp();

  await (isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] }));
}

async function handleHelpCommand(context, isSlash = false) {
  const embed = new EmbedBuilder()
    .setTitle('🎮 Bot Commands')
    .setColor('#00ff00')
    .addFields(
      { name: '🎲 Game Commands',
        value: '`/game` - Random game\n`/daily` - Today\'s featured game\n`/top` - Top 3 games\n`/search [term]` - Search games\n`/wishlist` - Manage your wishlist',
        inline: false },
      { name: '📺 Anime Commands',
        value: '`/anime` - Random anime recommendation\n`/animesearch [name]` - Search for specific anime',
        inline: false },
      { name: '📊 Stats & Info',
        value: '`/stats` - Bot statistics\n`/help` - This message\n`/about` - About the bot',
        inline: false }
    )
    .setFooter({ text: 'More features coming soon!' });

  await (isSlash ? context.reply({ embeds: [embed] }) : context.channel.send({ embeds: [embed] }));
}

async function handleAboutCommand(context) {
  const embed = new EmbedBuilder()
    .setTitle('About Indie Games Bot')
    .setColor('#7289da')
    .setDescription('A Discord bot for discovering amazing indie games and anime!')
    .addFields(
      { name: '🎮 Games',    value: 'Discover new indie games daily' },
      { name: '📺 Anime',    value: 'Get personalized anime recommendations' },
      { name: '🤖 Features', value: 'Easy-to-use slash commands and regular updates' }
    )
    .setFooter({ text: 'Use /help to see all commands' });

  await context.reply({ embeds: [embed] });
}

async function postDailyGame() {
  const games = getGames();
  if (!games?.length) {
    console.error('❌ No games available for daily post!');
    return;
  }

  const game = games[index];
  const channel = client.channels.cache.get(process.env.CHANNEL_ID);
  if (!channel) {
    console.error('❌ Channel not found! Check CHANNEL_ID in .env');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`📅 Daily Game: ${game.title}`)
    .setColor('#ff6b6b')
    .setDescription(game.description)
    .addFields({ name: '🔗 Play Now', value: `[Click here](${addAffiliate(game.link)})` })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await incrementStat('gameCount');

  index = (index + 1) % games.length;

  gameUseCount++;
  if (gameUseCount >= MAX_USE_BEFORE_REFRESH) {
    try {
      await reloadGames();
      gameUseCount = 0;
    } catch (err) {
      console.error('Error reloading games:', err);
    }
  }
}

async function handleWishlistCommand(context, isSlash = false) {
  if (!isSlash) return;

  const sub = context.options.getSubcommand();
  const userId = context.user.id;

  if (sub === 'add') {
    const title = context.options.getString('title');
    const games = getGames();
    const game = games.find(g => g.title.toLowerCase() === title.toLowerCase());
    const link = game ? game.link : '';
    const finalTitle = game ? game.title : title;

    try {
      await Wishlist.create({ userId, title: finalTitle, link });
      await context.reply({ content: `✅ Added **${finalTitle}** to your wishlist! Use \`/wishlist view\` to see it.`, ephemeral: true });
    } catch (err) {
      if (err.code === 11000) {
        await context.reply({ content: `❌ **${finalTitle}** is already in your wishlist!`, ephemeral: true });
      } else {
        await context.reply({ content: `❌ Failed to add to wishlist.`, ephemeral: true });
      }
    }
  } else if (sub === 'view') {
    const items = await Wishlist.find({ userId });
    if (!items.length) {
      return context.reply({ content: `Your wishlist is empty! Use \`/wishlist add [title]\` to save games.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${context.user.username}'s Wishlist`)
      .setColor('#0099ff');
    
    const list = items.map((item, i) => {
      return item.link ? `${i + 1}. [${item.title}](${addAffiliate(item.link)})` : `${i + 1}. **${item.title}**`;
    }).join('\n').slice(0, 4000);

    embed.setDescription(list || 'No items.');
    await context.reply({ embeds: [embed], ephemeral: true });
  } else if (sub === 'remove') {
    const title = context.options.getString('title');
    const result = await Wishlist.deleteOne({ userId, title: { $regex: new RegExp(`^${title}$`, 'i') } });
    if (result.deletedCount > 0) {
      await context.reply({ content: `✅ Removed **${title}** from your wishlist.`, ephemeral: true });
    } else {
      await context.reply({ content: `❌ **${title}** not found in your wishlist.`, ephemeral: true });
    }
  }
}

// ── Error handling ───────────────────────────────────────
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// ── Start the bot ────────────────────────────────────────
client.login(process.env.BOT_TOKEN);
