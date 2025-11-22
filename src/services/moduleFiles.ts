import * as fs from 'fs';
import * as path from 'path';
/**
 * Recursively scan `dir` and push relative file paths into `out`.
 *
 * @param {string} dir - directory to scan
 * @param {string} base - base path used to compute relative file paths
 * @param {string[]} out - accumulator for discovered files
 * @returns {void}
 */
function scanDirectory(dir: string, base: string, out: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDirectory(fullPath, base, out);
        } else if (entry.isFile()) {
            out.push(path.relative(base, fullPath));
        }
    }
}

/**
 * List files inside a modules directory recursively, returning paths relative to `base`.
 *
 * @param {string} dir - directory to list
 * @param {string} [base=dir] - base path to compute relative paths (defaults to `dir`)
 * @returns {string[]} array of relative file paths found under `dir`
 */
export function listModuleFiles(dir: string, base: string = dir): string[] {
    const files: string[] = [];
    scanDirectory(dir, base, files);
    return files;
}
