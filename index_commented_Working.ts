// sets a constant to determine whether the bot should respond without prompt
const respondWithoutPrompt = false;
// import required models
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const {
  InworldClient,
  InworldPacket,
  ServiceError,
  SessionToken,
  status,
} = require('@inworld/nodejs-sdk');

const {
  Client,
  DMChannel,
  GatewayIntentBits,
  Message,
  Partials,
  TextChannel,
} = require('discord.js');
// Initialize Discord client with required intents and partials
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [Partials.Channel],
});
// Define sessions file and parse its content 
const sessionsFile = 'sessions.json';
const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
const sessionsFilePath = path.join(__dirname, 'session.json');

const readSessionsFile = () => {
  if (!fs.existsSync(sessionsFilePath)) {
    const emptySessions = {};
    fs.writeFileSync(sessionsFilePath, JSON.stringify(emptySessions));
  }
  return JSON.parse(fs.readFileSync(sessionsFilePath, 'utf8'));
};
// Function to reset sessions file
const resetSessionsFile = () => {
  if (fs.existsSync(sessionsFilePath)) {
    try {
      fs.unlinkSync(sessionsFilePath);
    } catch (error) {
      console.error(`Error deleting session.json: \${error.message}`);
    }
  }
  const emptySessions = {};
  fs.writeFileSync(sessionsFilePath, JSON.stringify(emptySessions));
  console.log('Reset session.json file');
};
// Main function to run the bot
const run = async function () {
  // When the bot is ready, log to console and reset sessions file
  discordClient.on('ready', () => {
    console.log("I'm ready!");
    resetSessionsFile();
    // Schedule the reset of sessions file every 15 minutes
    cron.schedule('*/15 * * * *', resetSessionsFile);
  });
// When a message is created, process it
  discordClient.on('messageCreate', async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;
// If set to respond without prompt, send a message
    if (respondWithoutPrompt) {
      sendMessage(message);
    } else {
      // Check if the message only contains mentions
      const hasMentionsOnly = /^<[@|#|@&].*?>$/g.test(
        message.content.replace(/\s+/g, '')
      );
      // If it's a direct message, send a message
      if (message.channel instanceof DMChannel) {
        sendMessage(message, true);
      } else if (discordClient.user && message.mentions.has(discordClient.user)) {
        // If the bot is mentioned, send a message
        if (hasMentionsOnly) message.content = '*user says nothing*';
        sendMessage(message);
      }
    }
  });
// Log in to Discord with the bot token
  discordClient.login(process.env.DISCORD_BOT_TOKEN);
};

// Check for required environment variables and log their values


if (!process.env.INWORLD_KEY) {
  throw new Error('INWORLD_KEY env variable is required');
}
console.log(`INWORLD_KEY: ${process.env.INWORLD_KEY}`);

if (!process.env.INWORLD_SECRET) {
  throw new Error('INWORLD_SECRET env variable is required');
}
console.log(`INWORLD_SECRET: ${process.env.INWORLD_SECRET}`);

if (!process.env.INWORLD_SCENE) {
  throw new Error('INWORLD_SCENE env variable is required');
}
console.log(`INWORLD_SCENE: ${process.env.INWORLD_SCENE}`);

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN env variable is required');
}
console.log(`DISCORD_BOT_TOKEN: ${process.env.DISCORD_BOT_TOKEN}`);
// Run the main function
run();
// Function to send a message to the InworldClient
const sendMessage = async (message, direct) => {
  const content = message.content.replace(`<@${discordClient.user.id}>`, '');
  const client = await createInworldClient({ direct, message });
  const user = message.author.username;
  client.sendText(`Message from ${user}: ${content}`);
};
// Function to generate a session key
const getKey = (message) => `${message.channel.id}_${message.author.id}`;
// Function to generate a session token
const generateSessionToken = (key) => {
  return async () => {
    console.log('Generating session token...');
    const client = new InworldClient().setApiKey({
      key: process.env.INWORLD_KEY,
      secret: process.env.INWORLD_SECRET,
    });
    console.log(`API key: ${process.env.INWORLD_KEY}`);
    console.log(`API secret: ${process.env.INWORLD_SECRET}`);
    const token = await client.generateSessionToken();
    console.log(`Generated session token: ${token.toString()}`);
    const sessionId = sessions[key];
    const actualToken = new SessionToken({
      expirationTime: token.getExpirationTime(),
      token: token.getToken(),
      type: token.getType(),
      sessionId: sessionId || token.getSessionId(),
    });
    if (!sessionId) {
      sessions[key] = actualToken.getSessionId();
      fs.writeFileSync(sessionsFile, JSON.stringify(sessions));
    }
    return actualToken;
  };
};
// Create an Inworld client with the required props
const createInworldClient = async (props) => {
  const { message, direct } = props;
  const key = getKey(message);
   // Set the Inworld client's configuration, error handling, and message handling
  const client = new InworldClient()
    .setGenerateSessionToken(generateSessionToken(key))
    .setConfiguration({
      capabilities: { audio: false },
      ...(direct ? {} : { connection: { disconnectTimeout: 5 * 1000 } }),
    })
    .setScene(process.env.INWORLD_SCENE)
    .setOnError(handleError(message))
    .setOnMessage((packet) => {
      if (!direct && packet.isInteractionEnd()) {
        client.close();
        return;
      }
      if (packet.isText() && packet.text.final) {
        message.channel.send(packet.text.text);
      }
    })
    .build();
  return client;
};
// Function to handle errors in the Inworld client
const handleError = (message, direct) => {
  return (err) => {
    switch (err.code) {
      case status.ABORTED:
      case status.CANCELLED:
        break;
      case status.FAILED_PRECONDITION:
        sendMessage(message, direct);
        break;
      default:
        console.error(`Error: ${err.message}`);
        break;
    }
  };
};
// Function to clean up and exit the bot process
const done = () => {
  discordClient.destroy();
};
// Attach event listeners to handle process signals and unhandled rejections
process.on('SIGINT', done);
process.on('SIGTERM', done);
process.on('SIGUSR2', done);
process.on('unhandledRejection', (err) => {
  console.error(err.message);
  done();
});
