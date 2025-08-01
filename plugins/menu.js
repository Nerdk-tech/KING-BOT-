module.exports = {
    command: ".menu",
    run: async (sock, m) => {
        const msg = `🌟 *KING-BOT MENU* 🌟

• .groupmenu
• .music
• .movie
• .faketyping
• .fakerecord
`;
        await sock.sendMessage(m.key.remoteJid, { text: msg }, { quoted: m });
    }
};
