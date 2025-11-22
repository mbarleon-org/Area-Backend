import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = false;

interface Trigger {
    createConsumer?: (cb: (msg: any) => Promise<void> | void) => any;
    name?: string;
}

interface Registrars {
    registerQueueConsumer?: (info: Record<string, any>) => void;
}

interface JobInfo {
    workflow: any;
    trigger: string;
    cron: string;
    job: any;
}

/**
 * Build trigger outputs and initial node outputs from a queue message.
 *
 * @param {any} msg - message received from the queue
 * @param {Trigger} trig - trigger configuration
 * @returns {{ triggerOutputs: Record<string, any>, initialNodeOutputs: Record<string, any> }}
 */
function buildTriggerOutputs(msg: any, trig: Trigger): { triggerOutputs: Record<string, any>; initialNodeOutputs: Record<string, any>; } {
    const triggerOutputs = { body: msg, params: {}, query: {} };
    const initialNodeOutputs: Record<string, any> = {};
    if (trig.name) initialNodeOutputs[trig.name] = triggerOutputs;
    return { triggerOutputs, initialNodeOutputs };
}

/**
 * Dispatch workflow for a queue message with error handling.
 *
 * @param params - parameters required to dispatch
 */
async function runDispatch(params: {
    wf: any;
    msg: any;
    trig: Trigger;
    actionsList: any[];
    registry: any;
    options: any;
}) {
    const { wf, msg, trig, actionsList, registry, options } = params;
    const { triggerOutputs, initialNodeOutputs } = buildTriggerOutputs(msg, trig);
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
        console.error('queue consumer action error', wf?.id, e);
    }
}

/**
 * Create a consumer job using the trigger's `createConsumer` function.
 *
 * @param params - parameters for consumer creation
 * @returns {JobInfo|null} job info or null on failure
 */
function createConsumerJob(params: {
    wf: any;
    trig: Trigger;
    actionsList: any[];
    registry: any;
    options: any;
    registrars?: Registrars;
}): JobInfo | null {
    const { wf, trig, actionsList, registry, options, registrars } = params;
    if (!trig.createConsumer || typeof trig.createConsumer !== 'function') return null;
    try {
        const job = trig.createConsumer(async (msg: any) => {
            await runDispatch({ wf, msg, trig, actionsList, registry, options });
        });

        const info: JobInfo = { workflow: wf.id, trigger: trig.name || '<queue>', cron: 'queue', job };
        if (registrars && typeof registrars.registerQueueConsumer === 'function') {
            registrars.registerQueueConsumer(info);
        }
        return info;
    } catch (e) {
        console.error('queue consumer creation failed', e);
        return null;
    }
}

/**
 * Register a queue trigger.
 *
 * @param _app - unused app instance placeholder
 * @param wf - workflow object
 * @param trig - trigger configuration (expects `createConsumer` function)
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
    const consumerJob = createConsumerJob({ wf, trig, actionsList, registry, options, registrars });
    if (consumerJob) return consumerJob;

    const noopJob = { stop: () => { } };
    const info: JobInfo = { workflow: wf.id, trigger: (trig && (trig as any).name) || '<queue>', cron: 'queue', job: noopJob };
    if (registrars && typeof registrars.registerQueueConsumer === 'function') {
        registrars.registerQueueConsumer(info);
    }
    return info;
}
