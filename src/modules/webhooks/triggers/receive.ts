module.exports = {
    spec: {
        id: 'receive',
        pretty_name: 'Receive Webhook',
        description: 'Receives a webhook POST and returns the request body and params as outputs',
        webhook: {
            method: 'POST',
            path: '/webhook/:workflowId',
        },
        inputs: [],
        options: [
            { id: 'method', pretty_name: 'Webhook Method', type: 'string', description: 'The method of the webhook' },
            { id: 'path', pretty_name: 'Webhook Path', type: 'string', description: 'The path of the webhook' },
            { id: 'return_value', pretty_name: 'Return Value', type: 'string', description: '__last_node to return only the last node, or node name' }
        ],
        outputs: [
            { id: 'body', pretty_name: 'Body', type: 'json' },
            { id: 'params', pretty_name: 'URL Params', type: 'json' },
            { id: 'query', pretty_name: 'Query Params', type: 'json' },
        ],
    },

    handler: async function (_ctx, inputs) {
        return {
            body: inputs.body || null,
            params: inputs.params || null,
            query: inputs.query || null,
        };
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const apiWebhook = require('../../../api/triggers/webhook');
        if (!apiWebhook || typeof apiWebhook.register !== 'function') {
            throw new Error('api trigger for webhooks is not available');
        }
        return apiWebhook.register(_app, wf, trig, actionsList, registry, options, registrars);
    }
};
