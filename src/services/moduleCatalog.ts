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
 * Resolve the api directory used by the runtime.
 * Prefers the built `dist/api` directory when present, otherwise falls back to `src/api`.
 *
 * @returns {string} absolute path to the api directory
 */
export async function resolveApiDir(): Promise<string> {
    const distPath = path.resolve(process.cwd(), 'dist', 'api');
    if (await require('fs').existsSync(distPath)) {
        return distPath;
    }
    const srcPath = path.resolve(process.cwd(), 'src', 'api');
    if (await require('fs').existsSync(srcPath)) {
        return srcPath;
    }
    const relativeDistPath = path.resolve(__dirname, '..', 'api');
    if (await require('fs').existsSync(relativeDistPath)) {
        return relativeDistPath;
    }
    const relativeSrcPath = path.resolve(__dirname, '..', 'api');
    if (await require('fs').existsSync(relativeSrcPath)) {
        return relativeSrcPath;
    }

    return srcPath;
}

/**
 * Load the module catalog by reading the modules directory and delegating to the registry loader.
 *
 * @returns {Record<string, any>} module catalog object returned by `loadModules`
 */
export async function loadModuleCatalog(): Promise<Record<string, any>> {
    return loadModules(await resolveModulesDir());
}
