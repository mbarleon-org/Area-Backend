export { };
const crypto = require('crypto');
const express = require('express');
const { dispatchWorkflow } = require('../../../services/workflowRunner');

function getRawBody(req: any) {
    if (req && req.rawBody) return typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString();
    return JSON.stringify(req && req.body ? req.body : {});
}

function verifySignature(req: any, secret: string): boolean {
    if (!secret) return true;
    const sigHeader = req.headers && (req.headers['x-hub-signature-256'] as string);
    if (!sigHeader) return false;
    const body = getRawBody(req);
    const digest = 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sigHeader));
    } catch (_) {
        return false;
    }
}

module.exports = {
    spec: {
        id: 'new_issue',
        pretty_name: 'New Issue Created',
        description: 'Trigger when a new GitHub issue is opened.',
        webhook: {
            method: 'POST',
            path: '/webhook/github/issues/:workflowId'
        },
        options: [
            { id: 'path', pretty_name: 'Webhook Path', type: 'string', description: 'Override webhook path.' },
            { id: 'secret', pretty_name: 'Webhook Secret', type: 'string', description: 'Optional shared secret for signature verification.' }
        ],
        outputs: [
            { id: 'body', pretty_name: 'Body', type: 'json' },
            { id: 'issue', pretty_name: 'Issue', type: 'json' },
            { id: 'headers', pretty_name: 'Headers', type: 'json' }
        ]
    },

    handler: async function (_ctx: any, inputs: Record<string, any>) {
        return { body: inputs.body || null, issue: inputs.issue || null, headers: inputs.headers || null };
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const router = express.Router();
        const routePath = (trig && trig.path) || '/webhook/github/issues/' + wf.id;

        router.post('/', async (req: any, res: any) => {
            const secret = (trig && trig.secret)
                || (trig && trig.credentials && trig.credentials.secret && trig.credentials.secret.secret)
                || (trig && trig.credentials && trig.credentials.webhook_secret && trig.credentials.webhook_secret.secret);
            if (secret && !verifySignature(req, secret)) {
                return res.status(401).json({ error: 'invalid_signature' });
            }

            const eventType = req.headers && req.headers['x-github-event'];
            if (eventType !== 'issues') return res.status(202).json({ ok: true, ignored: true });
            const payload = req.body || {};
            if (!payload.action || payload.action !== 'opened') return res.status(202).json({ ok: true, ignored: true });

            const issue = payload.issue || {};
            const triggerOutputs = { body: payload, issue, headers: req.headers, params: req.params, query: req.query };
            const initialNodeOutputs: Record<string, any> = {};
            if (trig && trig.name) initialNodeOutputs[trig.name] = triggerOutputs;

            try {
                await dispatchWorkflow({ wf, actionsList, registry, triggerOutputs, initialNodeOutputs, options, req });
                return res.json({ ok: true });
            } catch (e: any) {
                console.error('github new_issue trigger error', e);
                return res.status(500).json({ error: e.message || 'trigger_failed' });
            }
        });

        if (registrars && typeof registrars.mountRouter === 'function') {
            return registrars.mountRouter(routePath, router);
        }

        return { workflow: wf.id, path: routePath, router };
    }
};
