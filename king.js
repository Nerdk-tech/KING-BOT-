const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore, fetchLatestBaileysVersion, jidNormalizedUser } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const pino = require("pino");

const pluginsPath = path.join(__dirname, "plugins");
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

const loadPlugins = () => {
    const plugins = [];
    const files = fs.readdirSync(pluginsPath).filter(file => file.endsWith(".js"));
    for (const file of files) {
        const plugin = require(path.join(pluginsPath, file));
        plugins.push(plugin);
    }
    return plugins;
};

async function promptNumber() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question("📱 Enter your WhatsApp number (with country code): ", (number) => {
            rl.close();
            resolve(number.trim());
        });
    });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session");

    const sock = makeWASocket({
        version: await fetchLatestBaileysVersion().then(v => v.version),
        printQRInTerminal: false,
        auth: state,
        logger: pino({ level: "silent" }),
        generateHighQualityLinkPreview: true,
    });

    store.bind(sock.ev);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin, pairingCode } = update;

        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ Bot connected successfully!");
        } else if (connection === "connecting") {
            console.log("🔗 Connecting...");
        }
    });

    if (!fs.existsSync("session/creds.json")) {
        const phoneNumber = await promptNumber();
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n🔗 Pair your device by visiting: https://web.whatsapp.com\n📟 Your pairing code: ${code}`);
    }

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const plugins = loadPlugins();

        for (const plugin of plugins) {
            if (body.startsWith(plugin.command)) {
                await plugin.run(sock, msg);
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startBot();
