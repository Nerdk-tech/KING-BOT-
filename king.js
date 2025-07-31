const { default: WAConnection, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = WAConnection({
        version,
        printQRInTerminal: true,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["KING-BOT", "Safari", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        require("./lib/handler")(sock, m);
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close" && lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            startBot();
        }
    });
}

startBot();
