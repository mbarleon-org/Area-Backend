import * as path from 'path';
import { loadModules } from '../modules/registry';

/**
 * Resolve the modules directory used by the runtime.
 * Prefers the built `dist/modules` directory when present, otherwise falls back to `src/modules`.
 *
 * @returns {string} absolute path to the modules directory
 */
function resolveModulesDir(): string {
    const distPath = path.resolve(process.cwd(), 'dist', 'modules');
    if (require('fs').existsSync(distPath)) {
        return distPath;
    }
    const srcPath = path.resolve(process.cwd(), 'src', 'modules');
    return srcPath;
}

/**
 * Load the module catalog by reading the modules directory and delegating to the registry loader.
 *
 * @returns {any} module catalog object returned by `loadModules`
 */
export function loadModuleCatalog(): any {
    return loadModules(resolveModulesDir());
}
