const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeInMemoryStore,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to', lastDisconnect.error, ', reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot is connected');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    if (text.startsWith('.menu')) {
      await sock.sendMessage(from, { text: `👑 *KING BOT MENU*\n\n.menu - Show this menu\n.music <name>\n.movie <title>\n.fakeTyping\n.fakeRecord` });
    }

    if (text.startsWith('.fakeTyping')) {
      await sock.sendPresenceUpdate('composing', from);
    }

    if (text.startsWith('.fakeRecord')) {
      await sock.sendPresenceUpdate('recording', from);
    }

    if (text.startsWith('.music')) {
      await sock.sendMessage(from, { text: `🎵 Music search for "${text.split(' ')[1]}" coming soon!` });
    }

    if (text.startsWith('.movie')) {
      await sock.sendMessage(from, { text: `🎬 Movie info for "${text.split(' ')[1]}" coming soon!` });
    }
  });
};

startBot();
