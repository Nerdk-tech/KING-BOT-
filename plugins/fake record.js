module.exports = {
    command: ".fakerecord",
    run: async (sock, m) => {
        await sock.sendPresenceUpdate("recording", m.key.remoteJid);
        await sock.sendMessage(m.key.remoteJid, { text: "Pretending to record audio..." }, { quoted: m });
    }
};
