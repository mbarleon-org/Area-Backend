module.exports = {
    spec: {
        id: 'receive',
        pretty_name: 'Message queue consumer',
        description: 'Consumes messages from a message queue. Module should provide createConsumer function on trigger.',
        inputs: [],
        options: [
            { id: 'queue', pretty_name: 'Queue name', type: 'string' }
        ],
        outputs: []
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const apiQueue = require('../../../api/triggers/queue');
        if (!apiQueue || typeof apiQueue.register !== 'function') {
            throw new Error('api trigger for queue.receive is not available');
        }
        return apiQueue.register(_app, wf, trig, actionsList, registry, options, registrars);
    }
};
