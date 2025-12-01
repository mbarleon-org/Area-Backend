module.exports = {
    spec: {
        id: 'message_recieved',
        pretty_name: 'Message received',
        description: 'Triggered when a Discord message is received. This trigger exposes a webhook endpoint that external adapters can call.',
        webhook: {
            method: 'POST',
            path: '/discord/:workflowId'
        },
        inputs: [],
        options: [],
        outputs: [
            { id: 'message', pretty_name: 'Message', type: 'json' },
            { id: 'author', pretty_name: 'Author', type: 'json' },
            { id: 'channel', pretty_name: 'Channel ID', type: 'string' }
        ]
    },

    handler: async function (_ctx: any, inputs: any) {
        return {
            message: inputs.body || null,
            author: inputs.body?.author || null,
            channel: inputs.body?.channel_id || null
        };
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        if (trig && trig.credential_id) {
            try {
                const gateway = require('./src/gateway');
                const { dispatchWorkflow } = require('../../../services/workflowRunner');

                const job = gateway.createListener(trig.credential_id, async (message: any) => {
                    try {
                        const triggerOutputs = { body: message, params: {}, query: {} };
                        const initialNodeOutputs: Record<string, any> = {};
                        if (trig.name) {
                            initialNodeOutputs[trig.name] = triggerOutputs;
                        }
                        await dispatchWorkflow({ wf, actionsList, registry, triggerOutputs, initialNodeOutputs, options });
                    } catch (e) {
                        console.error('discord gateway dispatch error', e);
                    }
                });

                if (registrars && typeof registrars.registerImapListener === 'function') {
                    registrars.registerImapListener({ workflow: wf.id, trigger: trig.name || 'discord', cron: 'discord-gateway', job });
                }
                return job;
            } catch (e) {
                console.error('discord gateway listener failed to start', e);
            }
        }

        const apiWebhook = require('../../../api/triggers/webhook');
        if (!apiWebhook || typeof apiWebhook.register !== 'function') {
            throw new Error('api trigger for webhooks is not available');
        }
        return apiWebhook.register(_app, wf, trig, actionsList, registry, options, registrars);
    }
};
