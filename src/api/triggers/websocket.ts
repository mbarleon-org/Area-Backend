import * as express from 'express';
import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = true;

interface Trigger {
    path?: string;
    name?: string;
}

interface Registrars {
    mountWebsocket?: (path: string, router: express.Router) => any;
}

interface JobInfo {
    workflow: any;
    trigger: string;
    cron: string;
    job: any;
}

/**
 * Normalize a websocket route path ensuring a leading slash and default.
 *
 * @param path - provided path from trigger
 * @param wfId - workflow id used as fallback
 * @returns normalized route path
 */
function normalizeRoutePath(path: any, wfId: any): string {
    let routePath: string = path || `/ws/${wfId}`;
    if (!routePath.startsWith('/')) routePath = `/${routePath}`;
    return routePath;
}

/**
 * Build trigger outputs for a request
 *
 * @param req - express request
 * @param trig - trigger config
 * @returns triggerOutputs and initialNodeOutputs
 */
function buildTriggerOutputs(req: express.Request, trig: Trigger) {
    const triggerOutputs = { body: req.body, params: req.params, query: req.query };
    const initialNodeOutputs: Record<string, any> = {};
    if (trig && trig.name) initialNodeOutputs[trig.name] = triggerOutputs;
    return { triggerOutputs, initialNodeOutputs };
}

/**
 * Dispatch workflow for websocket trigger with standardized error handling.
 *
 * @param params - dispatch parameters
 */
async function runDispatch(params: {
    wf: any;
    req: express.Request;
    trig: Trigger;
    actionsList: any[];
    registry: any;
    options: any;
}) {
    const { wf, req, trig, actionsList, registry, options } = params;
    const { triggerOutputs, initialNodeOutputs } = buildTriggerOutputs(req, trig);
    try {
        const runResult = await dispatchWorkflow({
            wf,
            actionsList,
            registry,
            triggerOutputs,
            initialNodeOutputs,
            options,
            req
        });
        return runResult;
    } catch (e) {
        console.error('websocket dispatch error', e);
        throw e;
    }
}

/**
 * Build an express handler that dispatches the workflow and returns responses similar to original behavior.
 *
 * @param params - handler construction params
 * @returns express.RequestHandler
 */
function buildHandler(params: { wf: any; trig: Trigger; actionsList: any[]; registry: any; options: any }) {
    const { wf, trig, actionsList, registry, options } = params;
    const handler: express.RequestHandler = async (req, res) => {
        try {
            const runResult = await runDispatch({ wf, req, trig, actionsList, registry, options });
            if (runResult.queued) {
                return res.status(202).json({ ok: true, jobId: runResult.jobId });
            }
            return res.json({ ok: true, outputs: runResult.outputs });
        } catch (e: any) {
            console.error('websocket trigger handler error', e);
            return res.status(500).json({ error: e.message || String(e) });
        }
    };
    return handler;
}

/**
 * Register a websocket route for a workflow. Preserves original behaviour but splits logic.
 *
 * @param _app - unused app instance placeholder
 * @param wf - workflow object
 * @param trig - trigger configuration (path, name)
 * @param actionsList - actions list
 * @param registry - module registry
 * @param options - runtime options for dispatchWorkflow
 * @param registrars - optional registrars to mount router
 * @returns mounted router info or an object describing the created route
 */
export function register(
    _app: any,
    wf: any,
    trig: Trigger,
    actionsList: any[],
    registry: any,
    options: any,
    registrars?: Registrars
): JobInfo | Record<string, any> {
    const routePath = normalizeRoutePath(trig && (trig as any).path, wf.id);

    const handler = buildHandler({ wf, trig, actionsList, registry, options });

    const router = express.Router();
    router.post('/', handler);

    if (registrars && typeof registrars.mountWebsocket === 'function') {
        return registrars.mountWebsocket(routePath, router);
    }

    return { workflow: wf.id, path: routePath, router };
}
