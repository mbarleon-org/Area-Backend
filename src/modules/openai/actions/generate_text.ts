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
        id: 'generate_text',
        pretty_name: 'Generate Text',
        description: 'Generate text from a prompt using an OpenAI chat model.',
        credential_type: 'openai.api_key',
        inputs: [
            { id: 'prompt', pretty_name: 'Prompt', type: 'string', required: true },
            { id: 'model', pretty_name: 'Model', type: 'string', required: false, default: 'gpt-4o-mini' },
            { id: 'temperature', pretty_name: 'Temperature', type: 'number', required: false, default: 0.7 }
        ],
        outputs: [
            { id: 'text', pretty_name: 'Text', type: 'string' },
            { id: 'model', pretty_name: 'Model', type: 'string' },
            { id: 'finish_reason', pretty_name: 'Finish Reason', type: 'string' }
        ]
    },

    handler: async (ctx: any, inputs: Record<string, any>) => {
        const cred = await ctx.getCredential('openai.api_key');
        const apiKey = cred && (cred.api_key || cred.token);
        if (!apiKey) throw new Error('missing OpenAI API key');

        const params = {
            model: inputs.model || 'gpt-4o-mini',
            temperature: inputs.temperature !== undefined ? Number(inputs.temperature) : 0.7,
            messages: [
                { role: 'user', content: inputs.prompt }
            ]
        };

        const res = await chatCompletion(apiKey, params);
        const choice = res.choices && res.choices[0];
        const text = extractMessageContent(choice);
        return {
            text,
            model: res.model || params.model,
            finish_reason: choice && choice.finish_reason
        };
    }
};
