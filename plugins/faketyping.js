module.exports = {
    command: ".faketyping",
    run: async (sock, m) => {
        await sock.sendPresenceUpdate("composing", m.key.remoteJid);
        await sock.sendMessage(m.key.remoteJid, { text: "Pretending to type..." }, { quoted: m });
    }
};
