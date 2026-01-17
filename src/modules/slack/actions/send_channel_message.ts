export { };

function getFetch() {
    const f: any = (global as any).fetch;
    if (!f) throw new Error('global fetch API is not available');
    return f;
}

async function postMessage(token: string, payload: Record<string, any>) {
    const fetchFn = getFetch();
    const res = await fetchFn('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json || !json.ok) {
        console.warn('[slack.send_channel_message] payload rejected', {
            httpStatus: res.status,
            payload,
            response: json
        });
        const err = (json && json.error) ? json.error : 'slack_post_failed';
        throw new Error(`Slack API error: ${err}`);
    }
    return json;
}

module.exports = {
    spec: {
        id: 'send_channel_message',
        pretty_name: 'Send Channel Message',
        description: 'Send a message to a Slack channel using a bot token.',
        credential_type: 'slack.bot_token',
        inputs: [
            { id: 'channel_id', pretty_name: 'Channel ID', type: 'string', required: true },
            { id: 'text', pretty_name: 'Text', type: 'string', required: true },
            { id: 'thread_ts', pretty_name: 'Thread Timestamp', type: 'string', required: false },
            { id: 'blocks', pretty_name: 'Blocks JSON', type: 'json', required: false }
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

        const payload: Record<string, any> = {
            channel: inputs.channel_id,
            text: inputs.text,
        };
        if (inputs.thread_ts) payload.thread_ts = inputs.thread_ts;
        if (inputs.blocks) payload.blocks = inputs.blocks;

        const res = await postMessage(token, payload);
        return { ts: res.ts, channel: res.channel, ok: true };
    }
};
