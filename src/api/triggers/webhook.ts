import * as express from 'express';
import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = true;

interface Trigger {
    path?: string;
    method?: string;
    name?: string;
    return_value?: any;
}

interface Registrars {
    mountRouter?: (path: string, router: express.Router) => any;
}

/**
 * Normalize a route path ensuring it starts with `/` and has a default.
 *
 * @param path - provided trigger path
 * @param wfId - workflow id used when no path provided
 * @returns normalized path string
 */
function normalizeRoutePath(path: any, wfId: any): string {
    let routePath: string = path || `/webhook/${wfId}`;
    if (!routePath.startsWith('/')) routePath = `/${routePath}`;
    return routePath;
}

/**
 * Given workflow outputs and trigger config, determine if a special return value
 * should be sent and build appropriate response body/status.
 *
 * @param outputs - outputs from the workflow run
 * @param trig - trigger configuration
 * @param actionsList - list of actions (used for __last_node logic)
 * @returns an object { handled, status, body } where handled=true means caller should send response
 */
function getReturnResponse(outputs: Record<string, any>, trig: Trigger, actionsList: any[]): { handled: boolean; status?: number; body?: any } {
    if (!trig || !trig.return_value) return { handled: false };
    if (typeof trig.return_value === 'string') {
        if (trig.return_value === '__last_node') {
            for (let i = actionsList.length - 1; i >= 0; i--) {
                const node = actionsList[i];
                if (node && node.name && Object.prototype.hasOwnProperty.call(outputs, node.name)) {
                    const result = outputs[node.name];
                    if (result && typeof result === 'object' && !Array.isArray(result)) {
                        const ks = Object.keys(result);
                        if (ks.length === 1) return { handled: true, body: result[ks[0]] };
                    }
                    return { handled: true, body: result };
                }
            }
            return { handled: false };
        } else {
            const nodeName = String(trig.return_value);
            if (Object.prototype.hasOwnProperty.call(outputs, nodeName)) {
                const result = outputs[nodeName];
                if (result && typeof result === 'object' && !Array.isArray(result)) {
                    const ks = Object.keys(result);
                    if (ks.length === 1) return { handled: true, body: result[ks[0]] };
                }
                return { handled: true, body: result };
            }
            return { handled: true, status: 400, body: { error: `requested return_value node '${nodeName}' not found` } };
        }
    }
    return { handled: false };
}

/**
 * Build the Express handler that dispatches the workflow and returns the proper response.
 *
 * @param params - handler construction params
 * @returns express.RequestHandler
 */
function buildHandler(params: {
    wf: any;
    trig: Trigger;
    actionsList: any[];
    registry: any;
    options: any;
}) {
    const { wf, trig, actionsList, registry, options } = params;
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

            const outputs = runResult.outputs || {};
            const ret = getReturnResponse(outputs, trig, actionsList);
            if (ret.handled) {
                if (ret.status) return res.status(ret.status).json(ret.body);
                return res.json(ret.body);
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
    return handler;
}

/**
 * Register a webhook route for a workflow.
 *
 * @param _app - unused app instance placeholder
 * @param wf - workflow object
 * @param trig - trigger configuration (path, method, name, return_value)
 * @param actionsList - actions list
 * @param registry - module registry
 * @param options - runtime options for dispatchWorkflow
 * @param registrars - optional registrars to mount router
 * @returns mounted router info or an object describing the created route
 */
export function register(_app: any, wf: any, trig: Trigger, actionsList: any[], registry: any, options: any, registrars?: Registrars) {
    const routePath = normalizeRoutePath(trig && (trig as any).path, wf.id);
    const handler = buildHandler({ wf, trig, actionsList, registry, options });

    const router = express.Router();
    if (!trig || !trig.method) {
        router.post('/', handler);
    } else if (trig.method === 'GET') {
        router.get('/', handler);
    } else {
        router.post('/', handler);
    }

    if (registrars && typeof registrars.mountRouter === 'function') {
        return registrars.mountRouter(routePath, router);
    }

    return { workflow: wf.id, path: routePath, router };
}
