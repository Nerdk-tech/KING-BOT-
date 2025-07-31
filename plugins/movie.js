module.exports = {
    command: ".movie",
    run: async (sock, m) => {
        await sock.sendMessage(m.key.remoteJid, { text: "🎬 Send the movie name, I’ll fetch it for you!" }, { quoted: m });
    }
};
