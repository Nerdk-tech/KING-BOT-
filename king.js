const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  getAggregateVotesInPollMessage,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  makeWALegacySocket,
  PHONENUMBER_MCC,
  proto,
  delay,
  Browsers,
  makeAuthState,
  makeRenewableMessageRelayCache,
  makeMessagesRx,
  downloadMediaMessage,
  generateForwardMessageContent,
  getContentType,
  generateWAMessageFromContent,
  generateWAMessageContent,
  generateWAMessage,
  prepareWAMessageMedia,
  jidDecode,
  WA_DEFAULT_EPHEMERAL,
  relayWAMessage,
  getAggregateVotesInPoll,
  fetchLatestBaileysVersions,
  getDevice,
  useSingleFileAuthState,
  makeCacheableSignalKeyStore as storeSignalKeyStore,
  BufferJSON,
  initAuthCreds,
  useAuthStore,
  makeWAMessage,
  getLogger
} = require("@whiskeysockets/baileys");

const P = require("pino");
const fs = require("fs");
const path = require("path");

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    browser: ["KING-BOT", "Safari", "3.0"]
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr, isNewLogin, pairingCode } = update;

    if (connection === "open") {
      console.log("✅ Connected!");
    }

    if (update.pairingCode) {
      console.log(`🔗 Pair your device by visiting: https://web.whatsapp.com`);
      console.log(`📲 Your Pairing Code: ${update.pairingCode}`);
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed. Reconnecting: ", shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    }
  });

  // Auto save session
  sock.ev.on("creds.update", saveCreds);

  // Load plugins
  const pluginFolder = path.join(__dirname, "plugins");
  if (fs.existsSync(pluginFolder)) {
    const pluginFiles = fs.readdirSync(pluginFolder).filter(file => file.endsWith(".js"));
    for (const file of pluginFiles) {
      try {
        const plugin = require(`./plugins/${file}`);
        if (plugin.command && plugin.run) {
          sock.ev.on("messages.upsert", async ({ messages }) => {
            const m = messages[0];
            if (!m.message || !m.key || m.key.fromMe) return;

            const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
            if (body.startsWith(plugin.command)) {
              try {
                await plugin.run(sock, m);
              } catch (err) {
                console.error("Plugin error:", err);
              }
            }
          });
        }
      } catch (err) {
        console.error("Error loading plugin:", file, err);
      }
    }
  }
};

startBot();
