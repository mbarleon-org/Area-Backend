module.exports = {
    spec: {
        id: 'publish',
        pretty_name: 'Redis Publish',
        description: 'Publish a message to a Redis channel.',
        inputs: [
            { id: 'channel', pretty_name: 'Channel', type: 'string', required: true },
            { id: 'message', pretty_name: 'Message', type: 'json', required: true }
        ],
        outputs: [],
        handler: async (ctx: any, inputs: any, options: any) => {
            const helper = require('./src/publisher');
            if (!helper || typeof helper.publish !== 'function') {
                throw new Error('redis publish helper not available');
            }
            await helper.publish(inputs, options);
        }
    }
};
