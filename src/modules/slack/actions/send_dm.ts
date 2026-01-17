export { };

function getFetch() {
    const f: any = (global as any).fetch;
    if (!f) throw new Error('global fetch API is not available');
    return f;
}

async function slackRequest(token: string, path: string, payload: Record<string, any>) {
    const fetchFn = getFetch();
    const res = await fetchFn(`https://slack.com/api/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json || !json.ok) {
        const err = (json && json.error) ? json.error : 'slack_api_failed';
        throw new Error(`Slack API error: ${err}`);
    }
    return json;
}

module.exports = {
    spec: {
        id: 'send_direct_message',
        pretty_name: 'Send Direct Message',
        description: 'Send a direct message to a Slack user using a bot token.',
        credential_type: 'slack.bot_token',
        inputs: [
            { id: 'user_id', pretty_name: 'User ID', type: 'string', required: true },
            { id: 'text', pretty_name: 'Text', type: 'string', required: true },
            { id: 'thread_ts', pretty_name: 'Thread Timestamp', type: 'string', required: false }
        ],
        outputs: [
            { id: 'ts', pretty_name: 'Message TS', type: 'string' },
            { id: 'channel', pretty_name: 'Channel', type: 'string' },
            { id: 'ok', pretty_name: 'Status', type: 'boolean' }
        ]
    },

    handler: async (ctx: any, inputs: Record<string, any>) => {
        const cred = await ctx.getCredential('slack.bot_token');
        const token = cred && (cred.token || cred.bot_token);
        if (!token) throw new Error('missing Slack bot token credential');

        const openRes = await slackRequest(token, 'conversations.open', { users: inputs.user_id });
        const channelId = openRes.channel && openRes.channel.id;
        if (!channelId) throw new Error('unable to open DM channel for user');

        const msgRes = await slackRequest(token, 'chat.postMessage', {
            channel: channelId,
            text: inputs.text,
            thread_ts: inputs.thread_ts,
        });

        return { ts: msgRes.ts, channel: msgRes.channel, ok: true };
    }
};
