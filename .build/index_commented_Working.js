"use strict";
const respondWithoutPrompt = false;
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const {
  InworldClient,
  InworldPacket,
  ServiceError,
  SessionToken,
  status
} = require("@inworld/nodejs-sdk");
const {
  Client,
  DMChannel,
  GatewayIntentBits,
  Message,
  Partials,
  TextChannel
} = require("discord.js");
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.DirectMessageReactions
  ],
  partials: [Partials.Channel]
});
const sessionsFile = "sessions.json";
const sessions = JSON.parse(fs.readFileSync(sessionsFile, "utf8"));
const sessionsFilePath = path.join(__dirname, "session.json");
const readSessionsFile = () => {
  if (!fs.existsSync(sessionsFilePath)) {
    const emptySessions = {};
    fs.writeFileSync(sessionsFilePath, JSON.stringify(emptySessions));
  }
  return JSON.parse(fs.readFileSync(sessionsFilePath, "utf8"));
};
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
  console.log("Reset session.json file");
};
const run = async function() {
  discordClient.on("ready", () => {
    console.log("I'm ready!");
    resetSessionsFile();
    cron.schedule("*/15 * * * *", resetSessionsFile);
  });
  discordClient.on("messageCreate", async (message) => {
    if (message.author.bot)
      return;
    if (respondWithoutPrompt) {
      sendMessage(message);
    } else {
      const hasMentionsOnly = /^<[@|#|@&].*?>$/g.test(
        message.content.replace(/\s+/g, "")
      );
      if (message.channel instanceof DMChannel) {
        sendMessage(message, true);
      } else if (discordClient.user && message.mentions.has(discordClient.user)) {
        if (hasMentionsOnly)
          message.content = "*user says nothing*";
        sendMessage(message);
      }
    }
  });
  discordClient.login(process.env.DISCORD_BOT_TOKEN);
};
if (!process.env.INWORLD_KEY) {
  throw new Error("INWORLD_KEY env variable is required");
}
console.log(`INWORLD_KEY: ${process.env.INWORLD_KEY}`);
if (!process.env.INWORLD_SECRET) {
  throw new Error("INWORLD_SECRET env variable is required");
}
console.log(`INWORLD_SECRET: ${process.env.INWORLD_SECRET}`);
if (!process.env.INWORLD_SCENE) {
  throw new Error("INWORLD_SCENE env variable is required");
}
console.log(`INWORLD_SCENE: ${process.env.INWORLD_SCENE}`);
if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN env variable is required");
}
console.log(`DISCORD_BOT_TOKEN: ${process.env.DISCORD_BOT_TOKEN}`);
run();
const sendMessage = async (message, direct) => {
  const content = message.content.replace(`<@${discordClient.user.id}>`, "");
  const client = await createInworldClient({ direct, message });
  const user = message.author.username;
  client.sendText(`Message from ${user}: ${content}`);
};
const getKey = (message) => `${message.channel.id}_${message.author.id}`;
const generateSessionToken = (key) => {
  return async () => {
    console.log("Generating session token...");
    const client = new InworldClient().setApiKey({
      key: process.env.INWORLD_KEY,
      secret: process.env.INWORLD_SECRET
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
      sessionId: sessionId || token.getSessionId()
    });
    if (!sessionId) {
      sessions[key] = actualToken.getSessionId();
      fs.writeFileSync(sessionsFile, JSON.stringify(sessions));
    }
    return actualToken;
  };
};
const createInworldClient = async (props) => {
  const { message, direct } = props;
  const key = getKey(message);
  const client = new InworldClient().setGenerateSessionToken(generateSessionToken(key)).setConfiguration({
    capabilities: { audio: false },
    ...direct ? {} : { connection: { disconnectTimeout: 5 * 1e3 } }
  }).setScene(process.env.INWORLD_SCENE).setOnError(handleError(message)).setOnMessage((packet) => {
    if (!direct && packet.isInteractionEnd()) {
      client.close();
      return;
    }
    if (packet.isText() && packet.text.final) {
      message.channel.send(packet.text.text);
    }
  }).build();
  return client;
};
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
const done = () => {
  discordClient.destroy();
};
process.on("SIGINT", done);
process.on("SIGTERM", done);
process.on("SIGUSR2", done);
process.on("unhandledRejection", (err) => {
  console.error(err.message);
  done();
});
//# sourceMappingURL=index_commented_Working.js.map
