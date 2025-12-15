import * as fs from 'fs';
import * as path from 'path';

/**
 * Try to require a module file. If requiring the provided path fails,
 * attempt to swap `.ts`/`.js` extensions and require again. This is
 * useful in development where compiled `.js` may live side-by-side with
 * source `.ts` files.
 *
 * @param fp - file path to require
 * @returns the required module's exports or throws the original error
 */
function tryRequire(fp: string): any {
    try {
        return require(fp);
    } catch (e: any) {
        if (fp.endsWith('.ts')) {
            try { return require(fp.replace(/\.ts$/, '.js')); } catch (e2) { /* ignore */ }
        } else if (fp.endsWith('.js')) {
            try { return require(fp.replace(/\.js$/, '.ts')); } catch (e2) { /* ignore */ }
        }
        throw e;
    }
}

function getModuleId(spec: any, mod: Record<string, any>, f: string): string {
    let id: string;
    if (spec && spec.id) {
        if (spec.id.indexOf('.') !== -1) {
            id = spec.id;
        } else {
            const prefix = (mod.info && mod.info.id) ? mod.info.id : name;
            id = `${prefix}.${spec.id}`;
        }
    } else {
        id = `${name}.${path.basename(f, path.extname(f))}`;
    }
    return id;
}

function getCredentials(modulePath: string, mod: Record<string, any>): void {
    const credDir = path.join(modulePath, 'credentials');
    if (fs.existsSync(credDir)) {
        for (const f of fs.readdirSync(credDir)) {
            const fp = path.join(credDir, f);
            if (!fs.statSync(fp).isFile()) continue;
            try {
                const exported = tryRequire(fp) || {};
                const exportedId = exported.id || path.basename(f, path.extname(f));
                let finalId: string;
                if (exportedId.indexOf('.') !== -1) {
                    finalId = exportedId;
                } else {
                    const prefix = (mod.info && mod.info.id) ? mod.info.id : name;
                    finalId = `${prefix}.${exportedId}`;
                }
                mod.credentials[finalId] = { ...exported, id: finalId };
            } catch (e) { }
        }
    }
}

function getActions(modulePath: string, mod: Record<string, any>): void {
    const actionsDir = path.join(modulePath, 'actions');
    if (fs.existsSync(actionsDir)) {
        for (const f of fs.readdirSync(actionsDir)) {
            const fp = path.join(actionsDir, f);
            if (!fs.statSync(fp).isFile()) continue;
            try {
                const exported = tryRequire(fp);
                const spec = exported && exported.spec ? exported.spec : exported;
                const id = getModuleId(spec, mod, f);
                const handler = spec.handler || exported.handler || exported.function;
                if (!handler) continue;
                mod.actions[id] = { spec: { ...spec, id }, handler };
            } catch (e: any) {
                console.error('failed loading action', fp, e && e.message ? e.message : e);
            }
        }
    }
}

function getTriggers(modulePath: string, mod: Record<string, any>): void {
    const triggersDir = path.join(modulePath, 'triggers');
    if (fs.existsSync(triggersDir)) {
        for (const f of fs.readdirSync(triggersDir)) {
            const fp = path.join(triggersDir, f);
            if (!fs.statSync(fp).isFile()) continue;
            try {
                const exported = tryRequire(fp);
                const spec = exported && exported.spec ? exported.spec : exported;
                const id = getModuleId(spec, mod, f);
                const handler = spec.handler || exported.handler || exported.function || (() => {});
                const register = exported.register || spec.register;
                if (!handler || !register) continue;
                mod.triggers[id] = { spec: { ...spec, id }, handler, register };
            } catch (e: any) {
                console.error('failed loading trigger', fp, e && e.message ? e.message : e);
            }
        }
    }
}

/**
 * Load modules from a directory on disk. Each module is expected to be a
 * directory containing optional `infos.ts`, a `credentials/` directory,
 * a `triggers/` directory, and an `actions/` directory. The function will
 * attempt to `require` those files and assemble a runtime registry object.
 *
 * @param baseDir - path to the modules root directory
 * @returns an object with a `modules` mapping (moduleName -> module metadata)
 */
export function loadModules(baseDir: string): { modules: Record<string, any> } {
    const modulesDir = path.resolve(baseDir);
    const modules: Record<string, any> = {};

    if (!fs.existsSync(modulesDir)) return { modules };

    for (const name of fs.readdirSync(modulesDir)) {
        const modulePath = path.join(modulesDir, name);
        if (!fs.statSync(modulePath).isDirectory()) continue;

        const mod: any = { info: null, credentials: {}, actions: {}, triggers: {} };

        let infoFile = path.join(modulePath, 'infos.ts');
        if (!fs.existsSync(infoFile)) {
            infoFile = path.join(modulePath, 'infos.js');
        }
        if (fs.existsSync(infoFile)) {
            try {
                mod.info = tryRequire(infoFile);
            } catch (e) { }
        }

        getCredentials(modulePath, mod);
        getActions(modulePath, mod);
        getTriggers(modulePath, mod);
        modules[name] = mod;
    }

    return { modules };
}

/**
 * Find a registered action by its full id within a registry object returned
 * by `loadModules`.
 *
 * @param registry - registry object (typically { modules })
 * @param actionId - the action identifier to look up (e.g. "module.action")
 * @returns the registered action entry or null when not found
 */
export function findAction(registry: any, actionId: string): any | null {
    for (const modName of Object.keys(registry.modules || {})) {
        const mod = registry.modules[modName];
        if (mod.actions && mod.actions[actionId]) return mod.actions[actionId];
    }
    return null;
}
