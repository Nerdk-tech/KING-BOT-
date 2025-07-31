module.exports = {
    command: ".music",
    run: async (sock, m) => {
        await sock.sendMessage(m.key.remoteJid, { text: "🎵 Send the name of the song you want to download!" }, { quoted: m });
    }
};
