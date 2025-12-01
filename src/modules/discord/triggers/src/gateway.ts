let clients: Map<string, any> = new Map();
let listeners: Map<string, Set<Function>> = new Map();

async function ensureClientForToken(token: string) {
    if (clients.has(token)) return clients.get(token);

    const { Client, GatewayIntentBits, Partials } = require('discord.js');
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
        partials: [Partials.Channel]
    });

    client.once('clientReady', () => {
        console.log('[discord.gateway] client ready', client.user?.tag || 'unknown');
    });

    client.on('messageCreate', async (msg: any) => {
        try {
            const tokenListeners = listeners.get(token);
            if (!tokenListeners || tokenListeners.size === 0) {
                return;
            }

            const payload = {
                id: msg.id,
                content: msg.content,
                author: { id: msg.author?.id, username: msg.author?.username, discriminator: msg.author?.discriminator },
                channel_id: msg.channel?.id,
                guild_id: msg.guild?.id,
                raw: msg
            };


            for (const cb of Array.from(tokenListeners)) {
                try {
                    await cb(payload);
                } catch (e) { }
            }
        } catch (e) { }
    });

    try {
        await client.login(token);
    } catch (e: any) {
        if (e && typeof e.message === 'string' && e.message.includes('Used disallowed intents')) {
            throw new Error('Discord login failed: the bot is using privileged gateway intents (Message Content).\n' +
                'Enable the "Message Content Intent" for your bot in the Discord Developer Portal (Application -> Bot -> Privileged Gateway Intents),\n' +
                'then restart the service. If your bot is in >100 guilds you may need to request verification from Discord.');
        }
        throw e;
    }
    clients.set(token, client);
    listeners.set(token, new Set());
    return client;
}

module.exports = {
    createListener: async function (credentialId: string | number, cb: (msg: any) => Promise<void> | void) {
        const credStore = require('../../../../services/credentialStore');
        const id = String(credentialId);
        const stored = await credStore.getCredentialById(id);
        if (!stored) {
            throw new Error(`credential ${id} not found`);
        }
        const data = stored.data || {};
        const token = data.token || data.bot_token || data.credential || data.app_password || data;
        if (!token) {
            throw new Error(`credential ${id} does not contain a bot token`);
        }

        await ensureClientForToken(String(token));
        const set = listeners.get(String(token)) || new Set();
        set.add(cb as any);
        listeners.set(String(token), set);

        return {
            stop: () => {
                try {
                    const s = listeners.get(String(token));
                    if (s) {
                        s.delete(cb as any);
                        if (s.size === 0) {
                            const c = clients.get(String(token));
                            try {
                                if (c && typeof c.destroy === 'function') {
                                    c.destroy();
                                }
                            } catch (e) { }
                            clients.delete(String(token));
                            listeners.delete(String(token));
                        } else {
                            listeners.set(String(token), s);
                        }
                    }
                } catch (e) { }
            }
        };
    }
};
