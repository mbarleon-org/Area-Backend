import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config.js';
import { validateWorkflow } from './loader';
import { listWorkflows, seedWorkflowsFromDir } from '../services/workflowStore.js';
import { RegisteredRoute, ScheduledJobInfo } from './types';

const { loadModules } = require('../modules/registry');

type UnregisterFn = () => void;

function unregisterRoute(app: any, routePath: string) {
    const stack = app._router && app._router.stack;
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

export async function registerWorkflows(app: any, options: any = {}): Promise<{ registered: RegisteredRoute[]; scheduled: ScheduledJobInfo[]; unregisterAll: UnregisterFn }> {
    const cwd = options.cwd || process.cwd();
    const modulesDir = options.modulesDir ||
        (fs.existsSync(path.join(cwd, 'dist', 'src', 'modules')) ? path.join(cwd, 'dist', 'src', 'modules')
            : fs.existsSync(path.join(cwd, 'dist', 'modules')) ? path.join(cwd, 'dist', 'modules')
                : fs.existsSync(path.join(cwd, 'src', 'modules')) ? path.join(cwd, 'src', 'modules')
                    : path.join(cwd, 'modules'));
    const registry = loadModules(modulesDir);

    const registered: RegisteredRoute[] = [];
    const scheduledJobs: ScheduledJobInfo[] = [];
    const usedPaths = new Set<string>();
    const duplicatePaths: string[] = [];
    const ids = new Set<string>();

    const triggerModules: Record<string, any> = {};

    const loadTriggerFile = (fp: string, moduleName?: string) => {
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
    };

    const triggersDir = path.join(__dirname, 'triggers');
    if (fs.existsSync(triggersDir)) {
        for (const f of fs.readdirSync(triggersDir)) {
            const fp = path.join(triggersDir, f);
            if (!fs.statSync(fp).isFile()) continue;
            loadTriggerFile(fp);
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
                loadTriggerFile(fp, modName);
            }
        }
    }

    if (options.seedFromDir !== false) {
        try {
            await seedWorkflowsFromDir(options.workflowsDir || path.join(cwd, 'workflows'));
        } catch (e) {
            console.error('[registerWorkflows] workflow seeding failed', e);
        }
    }

    const workflows = await listWorkflows();
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
            let trigModule = triggerModules[trig.type];
            if (!trigModule || typeof trigModule.register !== 'function') {
                try {
                    const parts = String(trig.type || '').split('.');
                    if (parts.length === 2) {
                        const [pref, local] = parts;
                        for (const modName2 of Object.keys(registry.modules || {})) {
                            const modEntry = registry.modules[modName2];
                            const modId = (modEntry && modEntry.info && modEntry.info.id) ? modEntry.info.id : modName2;
                            if (modId === pref || modName2 === pref) {
                                const fpTs = path.join(modulesDir, modName2, 'triggers', `${local}.ts`);
                                const fpJs = path.join(modulesDir, modName2, 'triggers', `${local}.js`);
                                if (fs.existsSync(fpTs)) {
                                    loadTriggerFile(fpTs, modName2);
                                } else if (fs.existsSync(fpJs)) {
                                    loadTriggerFile(fpJs, modName2);
                                }
                                if (triggerModules[trig.type]) {
                                    break;
                                }
                            }
                        }
                        trigModule = triggerModules[trig.type];
                    }
                } catch (e) { }

                if (!trigModule) {
                    try {
                        const parts2 = String(trig.type || '').split('.');
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
            }
            if (!trigModule || typeof trigModule.register !== 'function') {
                throw new Error(`no trigger module found for type ${trig.type}; registration is mandatory`);
            }

            const basePrefix = (CONFIG && CONFIG.BASE_PATH && CONFIG.BASE_PATH !== '/') ? String(CONFIG.BASE_PATH).replace(/\/$/, '') : '';

            const registrars = {
                mountRouter: (routePath: string, router: any) => {
                    const trigType = String(trig && trig.type || '').toLowerCase();
                    const normalizedPath = String(routePath || '');
                    const isWebhookOrWs = trigType.startsWith('webhooks') || trigType.startsWith('websocket') || normalizedPath.startsWith('/webhook') || normalizedPath.startsWith('/ws') || normalizedPath.startsWith('/websocket') || normalizedPath.startsWith('/webhooks');
                    const mountedPath = isWebhookOrWs ? normalizedPath : `${basePrefix}${normalizedPath}`;
                    if (usedPaths.has(mountedPath)) {
                        duplicatePaths.push(mountedPath);
                        return null;
                    }
                    app.use(mountedPath, router);
                    const info = { workflow: wf.id, path: mountedPath, router } as RegisteredRoute;
                    registered.push(info);
                    usedPaths.add(mountedPath);
                    return info;
                },
                scheduleJob: (jobInfo: any) => {
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
                },
                registerImapListener: (listenerInfo: any) => {
                    return (registrars as any).scheduleJob(listenerInfo);
                },
                registerQueueConsumer: (consumerInfo: any) => {
                    return (registrars as any).scheduleJob(consumerInfo);
                },
                mountWebsocket: (routePath: string, router: any) => {
                    return (registrars as any).mountRouter(routePath, router);
                }
            };

            try {
                const res = trigModule.register(app, wf, trig, actionsList, registry, options, registrars);
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
                const stack = app._router && app._router.stack;
                if (stack && Array.isArray(stack)) {
                    for (let i = stack.length - 1; i >= 0; i--) {
                        const layer = stack[i];
                        if (layer && layer.handle === (r as any).router) {
                            stack.splice(i, 1);
                        }
                    }
                }
            } else {
                unregisterRoute(app, r.path);
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
