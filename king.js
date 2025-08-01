const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const readline = require("readline");
const { delay } = require("@whiskeysockets/baileys");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // Ask for phone number
  rl.question("📞 ENTER PHONE NUMBER TO PAIR WITH WHATSAPP (e.g. +234XXXXXXXXXX): ", async (number) => {
    console.log("\n🔁 WAITING FOR PAIRING CODE...");

    await delay(1000);

    const code = await sock.requestPairingCode(number.trim());
    console.log("\n✅ PAIRING CODE GENERATED:");
    console.log(`\n👉 YOUR PAIRING CODE: \x1b[32m${code}\x1b[0m`);

    rl.close();
  });
}

startBot();
