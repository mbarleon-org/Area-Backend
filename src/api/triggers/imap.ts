import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = false;

export function register(_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
    if (trig.createListener && typeof trig.createListener === 'function') {
        try {
            const job = trig.createListener(async (message: any) => {
                try {
                    const triggerOutputs = { body: message, params: {}, query: {} };
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
                    console.error('imap listener action error', wf.id, e);
                }
            });
            const info = { workflow: wf.id, trigger: trig.name || '<imap>', cron: 'imap', job };
            if (registrars && typeof registrars.registerImapListener === 'function') {
                registrars.registerImapListener(info);
            }
            return info;
        } catch (e) {
            console.error('imap listener creation failed', e);
            return null;
        }
    }

    const noopJob = { stop: () => { } };
    const info = { workflow: wf.id, trigger: trig.name || '<imap>', cron: 'imap', job: noopJob };
    if (registrars && typeof registrars.registerImapListener === 'function') {
        registrars.registerImapListener(info);
    }
    return info;
}
