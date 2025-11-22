import * as express from 'express';
import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = true;

export function register(_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
    const routePath = trig.path || `/ws/${wf.id}`;

    const handler: express.RequestHandler = async (req, res) => {
        try {
            const triggerOutputs = { body: req.body, params: req.params, query: req.query };
            const initialNodeOutputs: Record<string, any> = {};
            if (trig.name) initialNodeOutputs[trig.name] = triggerOutputs;
            const runResult = await dispatchWorkflow({
                wf,
                actionsList,
                registry,
                triggerOutputs,
                initialNodeOutputs,
                options,
                req
            });
            if (runResult.queued) {
                return res.status(202).json({ ok: true, jobId: runResult.jobId });
            }
            return res.json({ ok: true, outputs: runResult.outputs });
        } catch (e: any) {
            console.error('websocket trigger handler error', e);
            return res.status(500).json({ error: e.message || String(e) });
        }
    };

    const router = express.Router();
    router.post('/', handler);

    if (registrars && typeof registrars.mountWebsocket === 'function') {
        return registrars.mountWebsocket(routePath, router);
    }

    return { workflow: wf.id, path: routePath, router };
}
