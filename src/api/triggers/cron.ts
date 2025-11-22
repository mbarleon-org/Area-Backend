import * as cron from 'node-cron';
import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = false;

function parseDurationToMs(d: any): number | null {
    if (d == null) {
        return null;
    }
    if (typeof d === 'number') {
        return Number(d);
    }
    if (typeof d !== 'string') {
        return null;
    }
    const m = d.trim().match(/^([0-9]+)\s*(ms|s|m|h|d)?$/i);
    if (!m) {
        return null;
    }
    const n = Number(m[1]);
    const unit = (m[2] || 's').toLowerCase();
    switch (unit) {
        case 'ms':
            return n;
        case 's':
            return n * 1000;
        case 'm':
            return n * 60 * 1000;
        case 'h':
            return n * 60 * 60 * 1000;
        case 'd':
            return n * 24 * 60 * 60 * 1000;
        default:
            return null;
    }
}

export function register(_app: any, wf: any, trig: any, actionsList: any[], registry: any, options: any, registrars?: any) {
    const cronExpr = trig.cron;
    const interval = trig.interval || trig.every || trig.duration;

    const ms = parseDurationToMs(interval);
    if (ms && ms > 0) {
        const id = setInterval(async () => {
            try {
            const triggerOutputs = { body: trig.payload || {}, params: {}, query: {} };
            const initialNodeOutputs: Record<string, any> = {};
            if (trig.name) {
                initialNodeOutputs[trig.name] = triggerOutputs;
            }
            await dispatchWorkflow({
                wf,
                actionsList,
                registry,
                triggerOutputs,
                initialNodeOutputs,
                options
            });
        } catch (e) {
            console.error('interval job error for', wf.id, e);
        }
    }, ms);

        const job = { id, stop: () => clearInterval(id) };
        const info = { workflow: wf.id, trigger: trig.name || '<interval>', cron: `interval:${ms}ms`, job };
        if (registrars && typeof registrars.scheduleJob === 'function') {
            registrars.scheduleJob(info);
            return info;
        }
        return info;
    }

    if (cronExpr) {
        try {
            const job = cron.schedule(cronExpr, async () => {
                try {
                    const triggerOutputs = { body: trig.payload || {}, params: {}, query: {} };
                    const initialNodeOutputs: Record<string, any> = {};
                    if (trig.name) {
                        initialNodeOutputs[trig.name] = triggerOutputs;
                    }
                    await dispatchWorkflow({
                        wf,
                        actionsList,
                        registry,
                        triggerOutputs,
                        initialNodeOutputs,
                        options
                    });
                } catch (e) {
                    console.error('cron job error for', wf.id, e);
                }
            });
            const info = { workflow: wf.id, trigger: trig.name || '<cron>', cron: cronExpr, job };
            if (registrars && typeof registrars.scheduleJob === 'function') {
                registrars.scheduleJob(info);
                return info;
            }
            return info;
        } catch (e) {
            console.error('invalid cron expression', trig, e);
            return null;
        }
    }

    return null;
}
