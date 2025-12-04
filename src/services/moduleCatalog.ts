import * as path from 'path';
import { loadModules } from '../modules/registry';

/**
 * Resolve the modules directory used by the runtime.
 * Prefers the built `dist/modules` directory when present, otherwise falls back to `src/modules`.
 *
 * @returns {string} absolute path to the modules directory
 */
export async function resolveModulesDir(): Promise<string> {
    const distPath = path.resolve(process.cwd(), 'dist', 'modules');
    if (await require('fs').existsSync(distPath)) {
        return distPath;
    }
    const srcPath = path.resolve(process.cwd(), 'src', 'modules');
    if (await require('fs').existsSync(srcPath)) {
        return srcPath;
    }
    const relativeDistPath = path.resolve(__dirname, '..', 'modules');
    if (await require('fs').existsSync(relativeDistPath)) {
        return relativeDistPath;
    }
    const relativeSrcPath = path.resolve(__dirname, '..', 'modules');
    if (await require('fs').existsSync(relativeSrcPath)) {
        return relativeSrcPath;
    }

    return srcPath;
}

/**
 * Load the module catalog by reading the modules directory and delegating to the registry loader.
 *
 * @returns {any} module catalog object returned by `loadModules`
 */
export async function loadModuleCatalog(): Promise<any> {
    return loadModules(await resolveModulesDir());
}
