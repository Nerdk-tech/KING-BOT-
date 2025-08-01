const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const readline = require("readline");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

console.log("🔗 Connecting...");

// Ask for number
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    },
    printQRInTerminal: true,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  // Load plugins
  const pluginFolder = path.join(__dirname, "plugins");
  if (fs.existsSync(pluginFolder)) {
    fs.readdirSync(pluginFolder).forEach(file => {
      if (file.endsWith(".js")) {
        const plugin = require(path.join(pluginFolder, file));
        sock.ev.on("messages.upsert", async ({ messages }) => {
          const m = messages[0];
          if (!m.message || !m.key || m.key.fromMe) return;
          const text = m.message?.conversation || m.message?.extendedTextMessage?.text;
          if (text && text.startsWith(plugin.command)) {
            await plugin.run(sock, m);
          }
        });
      }
    });
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, pairingCode } = update;
    if (pairingCode) {
      rl.question("📱 Enter your WhatsApp number (with country code): ", async (number) => {
        console.log(`🔗 Pair your device by visiting: https://web.whatsapp.com and entering this code:`);
        console.log(`\n🔐 Pairing Code for ${number}: ${pairingCode}\n`);
      });
    }
    if (connection === "open") {
      console.log("✅ Bot connected!");
    }
    if (connection === "close") {
      console.log("❌ Connection closed. Restart Termux.");
    }
  });
}

startBot();
