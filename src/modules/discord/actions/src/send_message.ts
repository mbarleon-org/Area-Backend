export default async function handler(ctx: any, inputs: any) {
    const cred = await ctx.getCredential('discord.bot_token');
    const token = cred?.token;
    if (!token) {
        throw new Error('discord.bot_token credential is required for send_message');
    }

    const content = inputs.content;

    const channelId = inputs.channel || inputs.channel_id || inputs.channelId || inputs.message?.channel_id || inputs.body?.channel_id || inputs.message?.channel || inputs.body?.channel;

    let finalChannelId = channelId;
    if (!finalChannelId && ctx && typeof ctx.getNodeOutput === 'function') {
        try {
            const discordNode = ctx.getNodeOutput('DiscordTrigger');
            if (discordNode) {
                finalChannelId = discordNode.channel || discordNode.channel_id || discordNode.body?.channel_id || discordNode.message?.channel_id || discordNode.body?.channel || discordNode.message?.channel;
            }
        } catch (e) { }
    }

    if (!finalChannelId) {
        throw new Error('channel input is required');
    }

    if (!content) {
        return {
            messageId: null,
            status: 'skipped'
        };
    }

    let fetchFn: any;
    if (typeof fetch !== 'undefined') {
        fetchFn = fetch;
    } else {
        try {
            fetchFn = require('node-fetch');
        } catch (e) {
            throw new Error('fetch is not available; install node-fetch or provide a helper module');
        }
    }

    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`;
    const res = await fetchFn(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bot ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Discord API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return {
        messageId: data.id,
        status: 'sent'
    };
}
