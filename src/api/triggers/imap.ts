import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = false;

/**
 * Lightweight Trigger interface for IMAP triggers.
 */
interface Trigger {
    createListener?: (cb: (message: any) => Promise<void> | void) => any;
    name?: string;
}

interface Registrars {
    registerImapListener?: (info: Record<string, any>) => void;
}

interface JobInfo {
    workflow: any;
    trigger: string;
    cron: string;
    job: any;
}

/**
 * Build the trigger outputs and initial node outputs for a received message.
 *
 * @param {any} message - The message payload received from IMAP listener
 * @param {Trigger} trig - The trigger configuration
 * @returns {{ triggerOutputs: Record<string, any>, initialNodeOutputs: Record<string, any> }}
 */
function buildTriggerOutputs(message: any, trig: Trigger): { triggerOutputs: Record<string, any>; initialNodeOutputs: Record<string, any>; } {
    const triggerOutputs = { body: message, params: {}, query: {} };
    const initialNodeOutputs: Record<string, any> = {};
    if (trig.name) initialNodeOutputs[trig.name] = triggerOutputs;
    return { triggerOutputs, initialNodeOutputs };
}

/**
 * Dispatch the workflow for a received IMAP message with error handling.
 *
 * @param params - parameters required to dispatch
 */
async function runDispatch(params: {
    wf: any;
    message: any;
    trig: Trigger;
    actionsList: any[];
    registry: any;
    options: any;
}) {
    const { wf, message, trig, actionsList, registry, options } = params;
    const { triggerOutputs, initialNodeOutputs } = buildTriggerOutputs(message, trig);
    try {
        await dispatchWorkflow({
            wf,
            actionsList,
            registry,
            triggerOutputs,
            initialNodeOutputs,
            options
        });
    } catch (e) {
        console.error('imap listener action error', wf?.id, e);
    }
}

/**
 * Attempt to create an IMAP listener using the provided trigger.
 *
 * @param params - creation parameters
 * @returns {JobInfo|null} job information or null on failure
 */
function createListenerJob(params: {
    wf: any;
    trig: Trigger;
    actionsList: any[];
    registry: any;
    options: any;
    registrars?: Registrars;
}): JobInfo | null {
    const { wf, trig, actionsList, registry, options, registrars } = params;
    if (!trig.createListener || typeof trig.createListener !== 'function') return null;
    try {
        const job = trig.createListener(async (message: any) => {
            await runDispatch({ wf, message, trig, actionsList, registry, options });
        });

        const info: JobInfo = { workflow: wf.id, trigger: trig.name || '<imap>', cron: 'imap', job };
        if (registrars && typeof registrars.registerImapListener === 'function') {
            registrars.registerImapListener(info);
        }
        return info;
    } catch (e) {
        console.error('imap listener creation failed', e);
        return null;
    }
}

/**
 * Register an IMAP trigger. This either creates a listener via `trig.createListener`
 * or returns a noop job. Behavior preserved from original implementation.
 *
 * @param _app - unused app instance placeholder
 * @param wf - workflow object
 * @param trig - trigger configuration (expects `createListener` function)
 * @param actionsList - list of actions for the workflow
 * @param registry - module registry
 * @param options - runtime options passed to dispatchWorkflow
 * @param registrars - optional registrars for scheduling reporting
 * @returns {JobInfo|null} information about the scheduled/listening job or null
 */
export function register(
    _app: any,
    wf: any,
    trig: Trigger,
    actionsList: any[],
    registry: any,
    options: any,
    registrars?: Registrars
): JobInfo | null {
    const listenerJob = createListenerJob({ wf, trig, actionsList, registry, options, registrars });
    if (listenerJob) return listenerJob;

    const noopJob = { stop: () => { } };
    const info: JobInfo = { workflow: wf.id, trigger: (trig && (trig as any).name) || '<imap>', cron: 'imap', job: noopJob };
    if (registrars && typeof registrars.registerImapListener === 'function') {
        registrars.registerImapListener(info);
    }
    return info;
}
