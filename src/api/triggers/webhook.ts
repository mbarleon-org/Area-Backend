import * as express from 'express';
import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = true;

export function register(_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
    let routePath: string = trig.path || `/webhook/${wf.id}`;
    if (!routePath.startsWith("/")) {
        routePath = `/${routePath}`;
    }
    const handler: express.RequestHandler = async (req, res) => {
        try {
            const triggerOutputs = { body: req.body, params: req.params, query: req.query };
            const initialNodeOutputs: Record<string, any> = {};
            if (trig.name) {
                initialNodeOutputs[trig.name] = triggerOutputs;
            }
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

            const outputs = runResult.outputs;

            if (trig && trig.return_value) {
                if (typeof trig.return_value === 'string') {
                    if (trig.return_value === '__last_node') {
                        for (let i = actionsList.length - 1; i >= 0; i--) {
                            const node = actionsList[i];
                            if (node && node.name && Object.prototype.hasOwnProperty.call(outputs, node.name)) {
                                const result = outputs[node.name];
                                if (result && typeof result === 'object' && !Array.isArray(result)) {
                                    const ks = Object.keys(result);
                                    if (ks.length === 1) return res.json(result[ks[0]]);
                                }
                                return res.json(result);
                            }
                        }

                    } else {
                        const nodeName = String(trig.return_value);
                        if (Object.prototype.hasOwnProperty.call(outputs, nodeName)) {
                            const result = outputs[nodeName];
                            if (result && typeof result === 'object' && !Array.isArray(result)) {
                                const ks = Object.keys(result);
                                if (ks.length === 1) return res.json(result[ks[0]]);
                            }
                            return res.json(result);
                        }
                        return res.status(400).json({ error: `requested return_value node '${nodeName}' not found` });
                    }
                }
            }

            return res.json({ ok: true, outputs });
        } catch (e: any) {
            console.error('webhook handler error', e);
            if (e && e.httpStatus) {
                return res.status(e.httpStatus).json({ error: e.message });
            }
            return res.status(500).json({ error: e.message || String(e) });
        }
    };

    const router = express.Router();
    if (!trig.method) {
        router.post('/', handler);
    } else if (trig.method === "GET") {
        router.get('/', handler);
    } else {
        router.post('/', handler);
    }

    if (registrars && typeof registrars.mountRouter === 'function') {
        return registrars.mountRouter(routePath, router);
    }

    return { workflow: wf.id, path: routePath, router };
}
