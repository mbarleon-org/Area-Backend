export { };
const express = require('express');
const { dispatchWorkflow } = require('../../../services/workflowRunner');

function tokenMatches(req: any, expected: string): boolean {
    if (!expected) return true;
    const headerToken = req.headers && (req.headers['x-area-token'] as string);
    const queryToken = req.query && (req.query.token as string);
    const bodyToken = req.body && (req.body.token as string);
    return headerToken === expected || queryToken === expected || bodyToken === expected;
}

module.exports = {
    spec: {
        id: 'new_row',
        pretty_name: 'New Row Added',
        description: 'Triggered when an external Google Sheets hook posts a new row payload.',
        webhook: {
            method: 'POST',
            path: '/webhook/sheets/:workflowId'
        },
        options: [
            { id: 'path', pretty_name: 'Webhook Path', type: 'string', description: 'Override the webhook path if desired.' },
            { id: 'verification_token', pretty_name: 'Verification Token', type: 'string', description: 'Optional shared secret to validate webhook calls.' }
        ],
        outputs: [
            { id: 'body', pretty_name: 'Body', type: 'json' },
            { id: 'row', pretty_name: 'Row Data', type: 'json' },
            { id: 'headers', pretty_name: 'Headers', type: 'json' }
        ]
    },

    handler: async function (_ctx: any, inputs: Record<string, any>) {
        return {
            body: inputs.body || null,
            row: inputs.row || inputs.body || null,
            headers: inputs.headers || null,
        };
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const router = express.Router();
        const routePath = (trig && trig.path) || '/webhook/sheets/' + wf.id;

        router.post('/', async (req: any, res: any) => {
            if (trig && trig.verification_token && !tokenMatches(req, trig.verification_token)) {
                return res.status(401).json({ error: 'invalid_token' });
            }

            const row = (req.body && (req.body.row || req.body.values)) || req.body;
            const triggerOutputs = { body: req.body || {}, row, headers: req.headers, params: req.params, query: req.query };
            const initialNodeOutputs: Record<string, any> = {};
            if (trig && trig.name) initialNodeOutputs[trig.name] = triggerOutputs;

            try {
                await dispatchWorkflow({ wf, actionsList, registry, triggerOutputs, initialNodeOutputs, options, req });
                return res.json({ ok: true });
            } catch (e: any) {
                console.error('google_sheets new_row trigger error', e);
                return res.status(500).json({ error: e.message || 'trigger_failed' });
            }
        });

        if (registrars && typeof registrars.mountRouter === 'function') {
            return registrars.mountRouter(routePath, router);
        }

        return { workflow: wf.id, path: routePath, router };
    }
};
