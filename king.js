const { Boom } = require('@hapi/boom');
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pino = require('pino');

const plugins = new Map();

// 🔌 Load plugins from plugins folder
const loadPlugins = () => {
    const pluginPath = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);

    const files = fs.readdirSync(pluginPath);
    for (const file of files) {
        const plugin = require(path.join(pluginPath, file));
        if (plugin.command && plugin.run) {
            plugins.set(plugin.command, plugin.run);
        }
    }
};

// 🤖 Create bot instance
async function startBot() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('📞 ENTER PHONE NUMBER TO PAIR WITH WHATSAPP (e.g. +234XXXXXXXXXX): ', async (number) => {
        rl.close();

        const { state, saveCreds } = await useMultiFileAuthState('auth');
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state
        });

        // Connect or get pairing code
        if (!sock.authState.creds.registered) {
            console.log('🔁 WAITING FOR PAIRING CODE...');
            const code = await sock.requestPairingCode(number);
            console.log(`✅ PAIR THIS CODE ON WHATSAPP:\n\n👉 ${code}\n`);
        }

        // Handle connection updates
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed. Reconnecting:', shouldReconnect);
                if (shouldReconnect) startBot();
            } else if (connection === 'open') {
                console.log('✅ Connected successfully!');
            }
        });

        // Save creds
        sock.ev.on('creds.update', saveCreds);

        // Handle messages
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const command = body.trim().split(' ')[0].toLowerCase();

            if (plugins.has(command)) {
                try {
                    await plugins.get(command)(sock, msg);
                } catch (e) {
                    console.log('❌ Error executing command:', e);
                }
            }
        });
    });
}

// ✅ Load plugins and start
loadPlugins();
startBot();
