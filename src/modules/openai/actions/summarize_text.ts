export { };

function getFetch() {
    const f: any = (global as any).fetch;
    if (!f) throw new Error('global fetch API is not available');
    return f;
}

function extractMessageContent(choice: any): string | undefined {
    function normalizeChunk(chunk: any): string {
        if (!chunk) return '';
        if (typeof chunk === 'string') return chunk;
        if (typeof chunk.text === 'string') return chunk.text;
        if (chunk.text && typeof chunk.text.value === 'string') return chunk.text.value;
        if (typeof chunk.value === 'string') return chunk.value;
        if (typeof chunk.content === 'string') return chunk.content;
        if (Array.isArray(chunk.text)) return chunk.text.map(normalizeChunk).join('');
        if (Array.isArray(chunk.content)) return chunk.content.map(normalizeChunk).join('');
        if (Array.isArray(chunk)) return chunk.map(normalizeChunk).join('');
        return '';
    }

    const content = choice && choice.message && choice.message.content;
    if (!content) {
        return undefined;
    }
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        const combined = content.map(normalizeChunk).join('').trim();
        return combined || undefined;
    }
    if (typeof content === 'object') {
        const combined = normalizeChunk(content).trim();
        return combined || undefined;
    }
    return undefined;
}

async function chatCompletion(apiKey: string, params: any) {
    const fetchFn = getFetch();
    const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    });
    const json = await res.json();
    if (!res.ok) {
        const err = (json && json.error && json.error.message) ? json.error.message : 'openai_request_failed';
        throw new Error(err);
    }
    return json;
}

module.exports = {
    spec: {
        id: 'summarize_text',
        pretty_name: 'Summarize Text',
        description: 'Summarize provided text using an OpenAI chat model.',
        credential_type: 'openai.api_key',
        inputs: [
            { id: 'text', pretty_name: 'Text to Summarize', type: 'string', required: true },
            { id: 'model', pretty_name: 'Model', type: 'string', required: false, default: 'gpt-4o-mini' },
            { id: 'style', pretty_name: 'Style', type: 'string', required: false, default: 'concise' }
        ],
        outputs: [
            { id: 'summary', pretty_name: 'Summary', type: 'string' },
            { id: 'model', pretty_name: 'Model', type: 'string' }
        ]
    },

    handler: async (ctx: any, inputs: Record<string, any>) => {
        const cred = await ctx.getCredential('openai.api_key');
        const apiKey = cred && (cred.api_key || cred.token);
        if (!apiKey) throw new Error('missing OpenAI API key');

        const params = {
            model: inputs.model || 'gpt-4o-mini',
            temperature: 0.3,
            messages: [
                { role: 'system', content: `Summarize the user text in a ${inputs.style || 'concise'} way.` },
                { role: 'user', content: inputs.text }
            ]
        };

        const res = await chatCompletion(apiKey, params);
        const choice = res.choices && res.choices[0];
        const summary = extractMessageContent(choice);
        return { summary, model: res.model || params.model };
    }
};
