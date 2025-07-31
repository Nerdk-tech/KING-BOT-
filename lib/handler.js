const fs = require("fs");
const path = require("path");

module.exports = async function handler(sock, m) {
    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";

    const plugins = fs.readdirSync("./plugins").filter(file => file.endsWith(".js"));

    for (const file of plugins) {
        const plugin = require(path.resolve("./plugins", file));
        if (plugin.command && text.toLowerCase().startsWith(plugin.command)) {
            await plugin.run(sock, m, text);
        }
    }
};
