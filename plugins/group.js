module.exports = {
    command: ".groupmenu",
    run: async (sock, m) => {
        const msg = `👥 *GROUP MENU*

• .tagall
• .kick
• .welcome on/off
• .antilink on/off
        `;
        await sock.sendMessage(m.key.remoteJid, { text: msg }, { quoted: m });
    }
};
