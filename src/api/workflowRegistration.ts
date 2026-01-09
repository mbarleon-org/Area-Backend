import * as fs from 'fs';
import * as path from 'path';
import { App } from '../app.js';
import { CONFIG } from '../config.js';
import { validateWorkflow } from './loader';
import { loadModules } from '../modules/registry';
import { RegisteredRoute, ScheduledJobInfo } from './types';
import { resolveModulesDir } from '../services/moduleCatalog.js';
import { listWorkflows, seedWorkflowsFromDir } from '../services/workflowStore.js';


type UnregisterFn = () => void;

/**
 * Remove a route by path from an express app's router stack.
 *
 * @param {any} app - Express application instance
 * @param {string} routePath - Path to remove from the app router
 * @returns {void}
 */
function unregisterRoute(routePath: string): void {
    const _router = App.getInstance<App>().getRouter();
    const stack = _router && _router.stack;
    if (!stack || !Array.isArray(stack)) {
        return;
    }
    for (let i = stack.length - 1; i >= 0; i--) {
        const layer = stack[i];
        if (layer && layer.route && layer.route.path === routePath) {
            stack.splice(i, 1);
        }
    }
}

/**
 * Load a trigger module file and register it under multiple keys for lookup.
 *
 * @param {string} fp - File path to the trigger module
 * @param {string|undefined} moduleName - Optional module folder name used as prefix
 * @param {any} registry - Modules registry used to resolve module prefixes
 * @param {Record<string, any>} triggerModules - Map where discovered trigger modules are registered
 * @returns {void}
 */
export function loadTriggerFile(fp: string, moduleName: string | undefined, registry: any, triggerModules: Record<string, any>): void {
    try {
        let mod = null;
        try {
            mod = require(fp.replace(/\.ts$/, '.js'));
        } catch (e) {
            try {
                mod = require(fp);
            } catch (e2) {
                try { mod = require(fp.replace(/\.ts$|\.js$/, '')); } catch (e3) { throw e3; }
            }
        }
        let t = mod && (mod.type || (mod.spec && mod.spec.id));
        if (moduleName && mod.spec && mod.spec.id) {
            const modEntry = registry.modules && registry.modules[moduleName];
            const prefix = (modEntry && modEntry.info && modEntry.info.id) ? modEntry.info.id : moduleName;
            if (mod.spec.id.indexOf('.') === -1) {
                t = mod.type || `${prefix}.${mod.spec.id}`;
            } else {
                t = mod.type || mod.spec.id;
            }
        }
        if (!t) {
            return;
        }
        if (triggerModules[t]) {
            throw new Error(`duplicate trigger module for type ${t} (file ${fp})`);
        }
        if (typeof mod.register !== 'function') {
            throw new Error(`trigger module ${fp} must export a 'register' function`);
        }
        triggerModules[t] = mod;
        try {
            if (moduleName && mod.spec && mod.spec.id) {
                const moduleKey = `${moduleName}.${String(mod.spec.id)}`;
                if (!triggerModules[moduleKey]) triggerModules[moduleKey] = mod;
                const modEntry = registry.modules && registry.modules[moduleName];
                const prefix = (modEntry && modEntry.info && modEntry.info.id) ? modEntry.info.id : moduleName;
                const prefKey = `${prefix}.${String(mod.spec.id)}`;
                if (!triggerModules[prefKey]) triggerModules[prefKey] = mod;
            }
            if (mod.type && !triggerModules[mod.type]) triggerModules[mod.type] = mod;
        } catch (e) { }
    } catch (e) {
        console.warn('failed loading trigger module', fp, e && e.message);
    }
}

/**
 * Load trigger modules from the local `triggers` folder and from each module's `triggers` folder.
 *
 * @param {string} modulesDir - Path to the modules directory to inspect
 * @param {any} registry - Modules registry used to resolve module folders
 * @param {Record<string, any>} triggerModules - Map where discovered trigger modules are registered
 * @returns {void}
 */
export function loadAllTriggers(modulesDir: string, registry: any, triggerModules: Record<string, any>): void {
    const triggersDir = path.join(__dirname, 'triggers');
    if (fs.existsSync(triggersDir)) {
        for (const f of fs.readdirSync(triggersDir)) {
            const fp = path.join(triggersDir, f);
            if (!fs.statSync(fp).isFile()) continue;
            loadTriggerFile(fp, undefined, registry, triggerModules);
        }
    }

    if (fs.existsSync(modulesDir)) {
        for (const modName of fs.readdirSync(modulesDir)) {
            const modPath = path.join(modulesDir, modName);
            try {
                if (!fs.statSync(modPath).isDirectory()) continue;
            } catch (e) { continue; }
            const mTriggers = path.join(modPath, 'triggers');
            if (!fs.existsSync(mTriggers)) continue;
            for (const f of fs.readdirSync(mTriggers)) {
                const fp = path.join(mTriggers, f);
                if (!fs.statSync(fp).isFile()) continue;
                loadTriggerFile(fp, modName, registry, triggerModules);
            }
        }
    }
}

/**
 * Seed workflows from directory if enabled in options.
 *
 * @param {any} options - Options object that may contain `seedFromDir` and `workflowsDir`
 * @param {string} cwd - Current working directory to resolve relative paths
 * @returns {Promise<void>} resolves when seeding completes (or immediately if disabled)
 */
export async function seedIfNeeded(options: any, cwd: string): Promise<void> {
    if (options.seedFromDir === false) return;
    try {
        await seedWorkflowsFromDir(options.workflowsDir || path.join(cwd, 'workflows'));
    } catch (e) {
        console.error('[registerWorkflows] workflow seeding failed', e);
    }
}

/**
 * Attempt to find and load a trigger module for the given trigger type when not preloaded.
 * This mirrors the original multi-pass discovery logic and may mutate `triggerModules`.
 *
 * @param {string} trigType - Trigger type identifier (may be namespaced like `module.trigger`)
 * @param {Record<string, any>} triggerModules - Map of already loaded trigger modules
 * @param {any} registry - Modules registry used to resolve candidate module folders
 * @param {string} modulesDir - Base modules directory to search within
 * @returns {any|undefined} the discovered trigger module or `undefined` if none found
 */
export function discoverTriggerModule(trigType: string, triggerModules: Record<string, any>, registry: any, modulesDir: string): any | undefined {
    let trigModule = triggerModules[trigType];
    if (trigModule && typeof trigModule.register === 'function') return trigModule;

    try {
        const parts = String(trigType || '').split('.');
        if (parts.length === 2) {
            const [pref, local] = parts;
            for (const modName2 of Object.keys(registry.modules || {})) {
                const modEntry = registry.modules[modName2];
                const modId = (modEntry && modEntry.info && modEntry.info.id) ? modEntry.info.id : modName2;
                if (modId === pref || modName2 === pref) {
                    const fpTs = path.join(modulesDir, modName2, 'triggers', `${local}.ts`);
                    const fpJs = path.join(modulesDir, modName2, 'triggers', `${local}.js`);
                    if (fs.existsSync(fpTs)) {
                        loadTriggerFile(fpTs, modName2, registry, triggerModules);
                    } else if (fs.existsSync(fpJs)) {
                        loadTriggerFile(fpJs, modName2, registry, triggerModules);
                    }
                    if (triggerModules[trigType]) {
                        break;
                    }
                }
            }
            trigModule = triggerModules[trigType];
        }
    } catch (e) { }

    if (!trigModule) {
        try {
            const parts2 = String(trigType || '').split('.');
            if (parts2.length === 2) {
                const local = parts2[1];
                for (const modName3 of Object.keys(registry.modules || {})) {
                    const fpTs2 = path.join(modulesDir, modName3, 'triggers', `${local}.ts`);
                    const fpJs2 = path.join(modulesDir, modName3, 'triggers', `${local}.js`);
                    let candidate = null;
                    if (fs.existsSync(fpTs2)) {
                        try { candidate = require(fpTs2.replace(/\.ts$/, '.js')) || require(fpTs2); } catch (e) { candidate = null; }
                    }
                    if (!candidate && fs.existsSync(fpJs2)) {
                        try { candidate = require(fpJs2.replace(/\.ts$/, '.js')) || require(fpJs2); } catch (e) { candidate = null; }
                    }
                    if (candidate && typeof candidate.register === 'function') {
                        const prefKey = `${modName3}.${local}`;
                        triggerModules[prefKey] = candidate;
                        const modEntry2 = registry.modules && registry.modules[modName3];
                        const prefix2 = (modEntry2 && modEntry2.info && modEntry2.info.id) ? modEntry2.info.id : modName3;
                        const prefKey2 = `${prefix2}.${local}`;
                        triggerModules[prefKey2] = candidate;
                        if (candidate.type) {
                            triggerModules[candidate.type] = candidate;
                        }
                        trigModule = candidate;
                        break;
                    }
                }
            }
        } catch (e) { }
    }

    return trigModule;
}

/**
 * Build registrars object for a given workflow and trigger.
 * The returned object exposes methods used by trigger modules to register routes and schedule jobs.
 *
 * @param {any} wf - Workflow object being registered
 * @param {any} trig - Trigger definition within the workflow
 * @param {Set<string>} usedPaths - Set tracking mounted route paths to detect duplicates
 * @param {string[]} duplicatePaths - Array collecting duplicate paths found during registration
 * @param {RegisteredRoute[]} registered - Array to push registered route info into
 * @param {ScheduledJobInfo[]} scheduledJobs - Array to push scheduled job info into
 * @returns {any} registrars object with methods: `mountRouter`, `scheduleJob`, `registerImapListener`, `registerQueueConsumer`, `mountWebsocket`
 */
export function buildRegistrars(wf: any, trig: any, usedPaths: Set<string>, duplicatePaths: string[], registered: RegisteredRoute[], scheduledJobs: ScheduledJobInfo[]): any {
    const basePrefix = (CONFIG && CONFIG.BASE_PATH && CONFIG.BASE_PATH !== '/') ? String(CONFIG.BASE_PATH).replace(/\/$/, '') : '';
    const registrars: any = {};
    registrars.mountRouter = (routePath: string, router: any) => {
        const trigType = String(trig && trig.type || '').toLowerCase();
        const normalizedPath = String(routePath || '');
        const isWebhookOrWs = trigType.startsWith('webhooks') || trigType.startsWith('websocket') || normalizedPath.startsWith('/webhook') || normalizedPath.startsWith('/ws') || normalizedPath.startsWith('/websocket') || normalizedPath.startsWith('/webhooks');
        const mountedPath = isWebhookOrWs ? normalizedPath : `${basePrefix}${normalizedPath}`;
        if (usedPaths.has(mountedPath)) {
            duplicatePaths.push(mountedPath);
            return null;
        }
        App.getInstance<App>().use(mountedPath, router);
        const info = { workflow: wf.id, path: mountedPath, router } as RegisteredRoute;
        registered.push(info);
        usedPaths.add(mountedPath);
        return info;
    };
    registrars.scheduleJob = (jobInfo: any) => {
        if (!jobInfo) {
            return jobInfo;
        }
        const already = scheduledJobs.find((j: any) => {
            if (j.job && jobInfo.job && j.job === jobInfo.job) {
                return true;
            }
            return j.workflow === jobInfo.workflow && j.trigger === jobInfo.trigger && j.cron === jobInfo.cron;
        });
        if (already) {
            return jobInfo;
        }
        scheduledJobs.push(jobInfo as ScheduledJobInfo);
        return jobInfo;
    };
    registrars.registerImapListener = (listenerInfo: any) => {
        return registrars.scheduleJob(listenerInfo);
    };
    registrars.registerQueueConsumer = (consumerInfo: any) => {
        return registrars.scheduleJob(consumerInfo);
    };
    registrars.mountWebsocket = (routePath: string, router: any) => {
        return registrars.mountRouter(routePath, router);
    };
    return registrars;
}

/**
 * Register workflows into the runtime/registry.
 * This function loads trigger modules, validates workflows, mounts routes and schedules jobs.
 * It has been factored into smaller helpers for readability and testability but preserves original behavior.
 *
 * @param {any} [options={}] - Optional configuration: `cwd`, `modulesDir`, `workflowsDir`, `seedFromDir`
 * @returns {Promise<{ registered: RegisteredRoute[]; scheduled: ScheduledJobInfo[]; unregisterAll: UnregisterFn }>} Resolves with registration metadata and an `unregisterAll` function
 */
export async function registerWorkflows(options: any = {}): Promise<{ registered: RegisteredRoute[]; scheduled: ScheduledJobInfo[]; unregisterAll: UnregisterFn }> {
    const cwd = options.cwd || process.cwd();

    const modulesDir = await resolveModulesDir();
    const registry = loadModules(modulesDir);

    const registered: RegisteredRoute[] = [];
    const scheduledJobs: ScheduledJobInfo[] = [];
    const usedPaths = new Set<string>();
    const duplicatePaths: string[] = [];
    const ids = new Set<string>();

    const triggerModules: Record<string, any> = {};

    loadAllTriggers(modulesDir, registry, triggerModules);
    await seedIfNeeded(options, cwd);

    const workflows = await listWorkflows();

    /**
     * Process and register all workflows found in the store.
     */
    for (const wf of workflows) {
        try {
            if (!wf.enabled) {
                continue;
            }
            const new_id = validateWorkflow(wf);
            if (ids.has(new_id)) {
                throw new Error(`workflow ${new_id} duplicate id`);
            }
            ids.add(new_id);
        } catch (e) {
            console.error('invalid workflow', wf && (wf as any).id, e);
            continue;
        }

        const actionsList = wf.actions || [];

        for (const trig of wf.triggers || []) {
            let trigModule = discoverTriggerModule(trig.type, triggerModules, registry, modulesDir);

            if (!trigModule || typeof trigModule.register !== 'function') {
                throw new Error(`no trigger module found for type ${trig.type}; registration is mandatory`);
            }

            const registrars = buildRegistrars(wf, trig, usedPaths, duplicatePaths, registered, scheduledJobs);

            try {
                const res = trigModule.register(wf, trig, actionsList, registry, options, registrars);
                if (res && res.job) {
                    registrars.scheduleJob(res);
                }
            } catch (e) {
                console.error('error registering trigger', trig.type, e);
            }
        }
    }

    if (duplicatePaths.length > 0) {
        const uniques = Array.from(new Set(duplicatePaths));
        throw new Error(`Duplicate webhook trigger paths found: ${uniques.join(', ')}`);
    }

    const unregisterAll = () => {
        for (const r of registered) {
            if ((r as any).router) {
                const _router = App.getInstance<App>().getRouter();
                const stack = _router && _router.stack;
                if (stack && Array.isArray(stack)) {
                    for (let i = stack.length - 1; i >= 0; i--) {
                        const layer = stack[i];
                        if (layer && layer.handle === (r as any).router) {
                            stack.splice(i, 1);
                        }
                    }
                }
            } else {
                unregisterRoute(r.path);
            }
        }
        for (const j of scheduledJobs as any) {
            if (j && j.job && typeof j.job.stop === 'function') {
                try { j.job.stop(); } catch (e) { }
            }
        }
    };

    return { registered, scheduled: scheduledJobs, unregisterAll };
}

export default { registerWorkflows };
