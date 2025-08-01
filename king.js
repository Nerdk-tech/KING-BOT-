const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const P = require('pino');

// Manually assign the renamed function (like 'as' in ES6)
const baileys = require('@whiskeysockets/baileys');
const storeSignalKeyStore = baileys.makeCacheableSignalKeyStore;

const fs = require('fs');
const path = require('path');

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: storeSignalKeyStore(state.keys, P({ level: 'silent' }))
    }
  });

  // Optional: store chat messages in memory (for multi-device)
  const store = makeInMemoryStore({});
  store.bind(sock.ev);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ BOT CONNECTED SUCCESSFULLY');
    }
  });

  sock.ev.on('creds.update', saveCreds);
};

startBot();
