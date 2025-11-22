module.exports = {
    spec: {
        id: 'debug_print',
        pretty_name: 'Debug Print',
        description: 'Print something in the debug console.',
        inputs: [
            { id: 'debug_string', pretty_name: 'Debug string', type: 'string', required: true }
        ],
        outputs: [
            { id: 'any', pretty_name: 'Dynamic outputs', type: 'json' }
        ],
        handler: async (ctx, inputs) => {
            ctx.logger.debug(inputs.debug_string);
        }
    }
};
