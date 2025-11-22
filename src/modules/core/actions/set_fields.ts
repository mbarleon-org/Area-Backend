module.exports = {
    spec: {
        id: 'set_fields',
        pretty_name: 'Set Fields',
        description: 'Set or compute fields for the workflow run.',
        outputs: [
            { id: 'any', pretty_name: 'Dynamic outputs', type: 'json' }
        ],
        handler: async (ctx, inputs) => {
            ctx.logger.info('core.set_fields running, inputs keys:', Object.keys(inputs || {}));
            const out: Record<string, any> = {};
            for (const k of Object.keys(inputs || {})) {
                out[k] = inputs[k];
            }
            return out;
        }
    }
};
