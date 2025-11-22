module.exports = {
    spec: {
        id: 'receive',
        pretty_name: 'Redis Pub/Sub consumer',
        description: 'Consumes messages from a Redis pub/sub channel. Uses a connection credential `redis.connection` if provided.',
        inputs: [],
        options: [
            { id: 'queue', pretty_name: 'Channel', type: 'string' }
        ],
        outputs: []
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const helper = require('./src/consumer');
        if (!helper || typeof helper.createConsumer !== 'function') {
            throw new Error('redis consumer helper not available');
        }

        trig.createConsumer = function (consumerFn: Function) {
            return helper.createConsumer(trig, consumerFn, options);
        };

        try {
            const { dispatchWorkflow } = require('../../../services/workflowRunner');
            const job = trig.createConsumer(async (msg: any) => {
                try {
                    const triggerOutputs = { body: msg, params: {}, query: {} };
                    const initialNodeOutputs: Record<string, any> = {};
                    if (trig.name) initialNodeOutputs[trig.name] = triggerOutputs;
                    await dispatchWorkflow({
                        wf,
                        actionsList,
                        registry,
                        triggerOutputs,
                        initialNodeOutputs,
                        options
                    });
                } catch (e) {
                    console.error('redis consumer action error', wf && wf.id, e);
                }
            });

            const info = { workflow: wf.id, trigger: trig.name || '<redis>', cron: 'redis', job };
            if (registrars && typeof registrars.registerQueueConsumer === 'function') {
                registrars.registerQueueConsumer(info);
            }
            return info;
        } catch (e) {
            console.error('redis consumer creation failed', e);
            return null;
        }
    }
};
