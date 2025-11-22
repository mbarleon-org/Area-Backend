import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = false;

export function register(_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
    if (trig.createConsumer && typeof trig.createConsumer === 'function') {
        try {
            const job = trig.createConsumer(async (msg: any) => {
                try {
                    const triggerOutputs = { body: msg, params: {}, query: {} };
                    const initialNodeOutputs: Record<string, any> = {};
                    if (trig.name) initialNodeOutputs[trig.name] = triggerOutputs;
                    await dispatchWorkflow({
                        wf,
                        actionsList,
                        registry,
                        triggerOutputs,
                        initialNodeOutputs,
                        options
                    });
                } catch (e) {
                    console.error('queue consumer action error', wf.id, e);
                }
            });
            const info = { workflow: wf.id, trigger: trig.name || '<queue>', cron: 'queue', job };
            if (registrars && typeof registrars.registerQueueConsumer === 'function') {
                registrars.registerQueueConsumer(info);
            }
            return info;
        } catch (e) {
            console.error('queue consumer creation failed', e);
            return null;
        }
    }

    const noopJob = { stop: () => { } };
    const info = { workflow: wf.id, trigger: trig.name || '<queue>', cron: 'queue', job: noopJob };
    if (registrars && typeof registrars.registerQueueConsumer === 'function') {
        registrars.registerQueueConsumer(info);
    }
    return info;
}
