import * as path from 'path';
const { loadModules } = require('../modules/registry');

function resolveModulesDir(): string {
    const distPath = path.resolve(process.cwd(), 'dist', 'modules');
    if (require('fs').existsSync(distPath)) {
        return distPath;
    }
    const srcPath = path.resolve(process.cwd(), 'src', 'modules');
    return srcPath;
}

export function loadModuleCatalog() {
    return loadModules(resolveModulesDir());
}
