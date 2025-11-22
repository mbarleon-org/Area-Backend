import * as fs from 'fs';
import * as path from 'path';

export function listModuleFiles(dir: string, base: string = dir): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...listModuleFiles(fullPath, base));
        } else if (entry.isFile()) {
            files.push(path.relative(base, fullPath));
        }
    }
    return files;
}
