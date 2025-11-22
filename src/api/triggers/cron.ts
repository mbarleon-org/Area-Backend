import * as cron from 'node-cron';
import { dispatchWorkflow } from '../../services/workflowRunner.js';

export const mountsRouter = false;

/**
 * Lightweight description of a trigger object used by this module.
 */
interface Trigger {
    cron?: string;
    interval?: number | string;
    every?: number | string;
    duration?: number | string;
    payload?: any;
    name?: string;
}

interface Registrars {
    scheduleJob?: (info: Record<string, any>) => void;
}

interface JobInfo {
    workflow: any;
    trigger: string;
    cron: string;
    job: any;
}

/**
 * Parse a duration value to milliseconds.
 * Supports numbers (treated as milliseconds) and strings like '5s', '10 m', '200ms'.
 *
 * @param {number|string|null|undefined} d - Duration value to parse
 * @returns {number|null} Milliseconds or null if parsing failed
 */
function parseDurationToMs(d: number | string | null | undefined): number | null {
    if (d == null) return null;
    if (typeof d === 'number') return Number(d);
    if (typeof d !== 'string') return null;
    const m = d.trim().match(/^([0-9]+)\s*(ms|s|m|h|d)?$/i);
    if (!m) return null;
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

/**
 * Build the trigger output objects used when dispatching a workflow run.
 *
 * @param {Trigger} trig - trigger configuration
 * @returns {{ triggerOutputs: Record<string, any>, initialNodeOutputs: Record<string, any> }}
 */
function buildTriggerOutputs(trig: Trigger) {
    const triggerOutputs = { body: trig.payload || {}, params: {}, query: {} };
    const initialNodeOutputs: Record<string, any> = {};
    if (trig.name) initialNodeOutputs[trig.name] = triggerOutputs;
    return { triggerOutputs, initialNodeOutputs };
}

/**
 * Execute dispatchWorkflow with proper error handling and argument shape.
 *
 * @param args - parameters required for dispatch
 */
async function runDispatch(args: {
    wf: any;
    actionsList: any[];
    registry: any;
    options: any;
    trig: Trigger;
}) {
    const { wf, actionsList, registry, options, trig } = args;
    const { triggerOutputs, initialNodeOutputs } = buildTriggerOutputs(trig);
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
        console.error('dispatch workflow error for', wf?.id, e);
    }
}

/**
 * Schedule an interval-based job using `setInterval`.
 *
 * @param params - object with scheduling parameters
 * @returns {JobInfo|null} info about the scheduled job or null
 */
function scheduleInterval(params: {
    wf: any;
    trig: Trigger;
    ms: number;
    actionsList: any[];
    registry: any;
    options: any;
    registrars?: Registrars;
}): JobInfo | null {
    const { wf, trig, ms, actionsList, registry, options, registrars } = params;
    if (!ms || ms <= 0) return null;
    const id = setInterval(async () => {
        await runDispatch({ wf, actionsList, registry, options, trig });
    }, ms);

    const job = { id, stop: () => clearInterval(id) };
    const info: JobInfo = { workflow: wf.id, trigger: trig.name || '<interval>', cron: `interval:${ms}ms`, job };
    if (registrars && typeof registrars.scheduleJob === 'function') {
        registrars.scheduleJob(info);
        return info;
    }
    return info;
}

/**
 * Schedule a cron expression using `node-cron`.
 *
 * @param params - object with cron scheduling parameters
 * @returns {JobInfo|null} info about the scheduled job or null
 */
function scheduleCron(params: {
    wf: any;
    trig: Trigger;
    cronExpr: string;
    actionsList: any[];
    registry: any;
    options: any;
    registrars?: Registrars;
}): JobInfo | null {
    const { wf, trig, cronExpr, actionsList, registry, options, registrars } = params;
    try {
        const job = cron.schedule(cronExpr, async () => {
            await runDispatch({ wf, actionsList, registry, options, trig });
        });
        const info: JobInfo = { workflow: wf.id, trigger: trig.name || '<cron>', cron: cronExpr, job };
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

/**
 * Register a trigger that can be either interval-based or a cron expression.
 * The function keeps the original behavior while being split into helpers.
 *
 * @param _app - unused app instance placeholder
 * @param wf - workflow object
 * @param trig - trigger configuration (cron or interval)
 * @param actionsList - list of actions for the workflow
 * @param registry - module registry
 * @param options - runtime options passed to dispatchWorkflow
 * @param registrars - optional registrars for scheduling reporting
 * @returns {JobInfo|null} information about the scheduled job or null
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
    const cronExpr = trig.cron;
    const interval = trig.interval || trig.every || trig.duration;

    const ms = parseDurationToMs(interval as number | string | null | undefined);
    const intervalJob = scheduleInterval({ wf, trig, ms: ms ?? 0, actionsList, registry, options, registrars });
    if (intervalJob) return intervalJob;

    if (cronExpr) {
        return scheduleCron({ wf, trig, cronExpr, actionsList, registry, options, registrars });
    }

    return null;
}
