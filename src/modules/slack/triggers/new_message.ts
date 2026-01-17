export { };
const crypto = require('crypto');
const express = require('express');
const { dispatchWorkflow } = require('../../../services/workflowRunner');

function buildRawBody(req: any) {
    if (req && req.rawBody) return typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString();
    return JSON.stringify(req && req.body ? req.body : {});
}

function verifySlackSignature(req: any, signingSecret: string): boolean {
    if (!signingSecret) return true;
    const ts = req.headers && (req.headers['x-slack-request-timestamp'] as string);
    const sig = req.headers && (req.headers['x-slack-signature'] as string);
    if (!ts || !sig) return false;
    const body = buildRawBody(req);
    const base = `v0:${ts}:${body}`;
    const hmac = crypto.createHmac('sha256', signingSecret).update(base, 'utf8').digest('hex');
    const computed = `v0=${hmac}`;
    try {
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig));
    } catch (_) {
        return false;
    }
}

module.exports = {
    spec: {
        id: 'new_message',
        pretty_name: 'New Message in Channel',
        description: 'Triggered when a new message is posted in a Slack channel.',
        webhook: {
            method: 'POST',
            path: '/webhook/slack/events/:workflowId'
        },
        options: [
            { id: 'path', pretty_name: 'Webhook Path', type: 'string', description: 'Override the webhook path if desired.' },
            { id: 'signing_secret', pretty_name: 'Signing Secret (optional)', type: 'string', description: 'If provided, used to verify Slack signatures. Uses slack.signing_secret credential when not set.' }
        ],
        outputs: [
            { id: 'body', pretty_name: 'Body', type: 'json' },
            { id: 'event', pretty_name: 'Event', type: 'json' },
            { id: 'headers', pretty_name: 'Headers', type: 'json' }
        ]
    },

    handler: async function (_ctx: any, inputs: Record<string, any>) {
        return {
            body: inputs.body || null,
            event: inputs.event || null,
            headers: inputs.headers || null,
        };
    },

    register: function (_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
        const router = express.Router();
        const routePath = (trig && trig.path) || '/webhook/slack/events/' + wf.id;

        router.post('/', async (req: any, res: any) => {
            const credSecret = trig && trig.signing_secret;
            const envSecret = credSecret || (trig && trig.credentials && trig.credentials.signing_secret);
            const secret = envSecret || (trig && trig.secrets && trig.secrets.signing_secret) || '';
            if (secret && !verifySlackSignature(req, secret)) {
                return res.status(401).json({ error: 'invalid_signature' });
            }

            const payload = req.body || {};
            if (payload.type === 'url_verification' && payload.challenge) {
                return res.status(200).json({ challenge: payload.challenge });
            }

            const event = payload.event || {};
            if (!event || event.type !== 'message' || event.subtype === 'message_deleted') {
                return res.status(200).json({ ok: true, ignored: true });
            }

            const triggerOutputs = { body: payload, event, headers: req.headers, params: req.params, query: req.query };
            const initialNodeOutputs: Record<string, any> = {};
            if (trig && trig.name) initialNodeOutputs[trig.name] = triggerOutputs;

            try {
                await dispatchWorkflow({ wf, actionsList, registry, triggerOutputs, initialNodeOutputs, options, req });
                return res.json({ ok: true });
            } catch (e: any) {
                console.error('slack new_message trigger error', e);
                return res.status(500).json({ error: e.message || 'trigger_failed' });
            }
        });

        if (registrars && typeof registrars.mountRouter === 'function') {
            return registrars.mountRouter(routePath, router);
        }

        return { workflow: wf.id, path: routePath, router };
    }
};
