const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, jidDecode, DisconnectReason, delay } = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");

const store = makeInMemoryStore({ logger: P().child({ level: "silent", stream: "store" }) });
store.readFromFile("./baileys_store.json");
setInterval(() => {
    store.writeToFile("./baileys_store.json");
}, 10_000);

const startKingBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("session");

    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: true,
        auth: state,
        browser: ['KING BOT', 'Chrome', '1.0.0'],
        syncFullHistory: false
    });

    store.bind(sock.ev);
    sock.ev.on("creds.update", saveCreds);

    // Load all plugin commands
    const pluginsDir = path.join(__dirname, "plugins");
    const plugins = fs.readdirSync(pluginsDir).filter(file => file.endsWith(".js"));

    for (const pluginFile of plugins) {
        const plugin = require(path.join(pluginsDir, pluginFile));
        if (typeof plugin === "function") plugin(sock, store);
    }

    // Connection closed handler
    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
        if (connection === "close") {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.loggedOut) {
                console.log("🔌 Logged out. Delete session and restart.");
            } else {
                console.log("🔁 Reconnecting...");
                startKingBot();
            }
        } else if (connection === "open") {
            console.log("✅ BOT connected successfully!");
        }
    });
};

startKingBot();
