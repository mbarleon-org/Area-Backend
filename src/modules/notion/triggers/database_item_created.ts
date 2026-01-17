export { };
const express = require('express');
const { dispatchWorkflow } = require('../../../services/workflowRunner');

function tokenMatches(req: any, expected: string): boolean {
    if (!expected) return true;
    const headerToken = req.headers && (req.headers['x-notion-signature'] as string);
    const queryToken = req.query && (req.query.token as string);
    const bodyToken = req.body && (req.body.token as string);
    return headerToken === expected || queryToken === expected || bodyToken === expected;
}

module.exports = {
    spec: {
        id: 'database_item_created',
        pretty_name: 'Database Item Created',
        description: 'Triggered when a Notion database item is created (via webhook). Notion webhooks do not include signatures; verification token is optional and only used if you front an additional signer.',
        webhook: {
            method: 'POST',
            path: '/webhook/notion/:workflowId'
        },
        options: [
            { id: 'path', pretty_name: 'Webhook Path', type: 'string', description: 'Override webhook path.' },
            { id: 'verification_token', pretty_name: 'Verification Token', type: 'string', description: 'Optional secret (e.g. if you front with your own signer); Notion webhooks do not send signatures.' }
        ],
        outputs: [
            { id: 'body', pretty_name: 'Body', type: 'json' },
            { id: 'page', pretty_name: 'Page', type: 'json' },
            { id: 'headers', pretty_name: 'Headers', type: 'json' }
        ]
    },

    handler: async function (_ctx: any, inputs: Record<string, any>) {
        return { body: inputs.body || null, page: inputs.page || null, headers: inputs.headers || null };
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const router = express.Router();
        const routePath = (trig && trig.path) || '/webhook/notion/' + wf.id;

        router.post('/', async (req: any, res: any) => {
            const vtoken = (trig && trig.verification_token)
                || (trig && trig.credentials && trig.credentials.verification_token && trig.credentials.verification_token.token)
                || (trig && trig.credentials && trig.credentials.webhook_secret && trig.credentials.webhook_secret.secret);
            if (vtoken && !tokenMatches(req, vtoken)) {
                return res.status(401).json({ error: 'invalid_token' });
            }

            const payload = req.body || {};
            const eventType = (req.headers && req.headers['x-notion-event']) || payload.event;
            if (eventType && eventType !== 'database_item.created') {
                return res.status(202).json({ ok: true, ignored: true });
            }

            const page = payload.page || payload.data || payload.body || null;
            const triggerOutputs = { body: payload, page, headers: req.headers, params: req.params, query: req.query };
            const initialNodeOutputs: Record<string, any> = {};
            if (trig && trig.name) initialNodeOutputs[trig.name] = triggerOutputs;

            try {
                await dispatchWorkflow({ wf, actionsList, registry, triggerOutputs, initialNodeOutputs, options, req });
                return res.json({ ok: true });
            } catch (e: any) {
                console.error('notion database_item_created trigger error', e);
                return res.status(500).json({ error: e.message || 'trigger_failed' });
            }
        });

        if (registrars && typeof registrars.mountRouter === 'function') {
            return registrars.mountRouter(routePath, router);
        }

        return { workflow: wf.id, path: routePath, router };
    }
};
