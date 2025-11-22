import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { readJsoncFile } from './readFile';
import { getDataSource } from '../services/dataSource.js';
import { Workflow as WorkflowEntity } from '../db/types/workflow';

export async function importLegacyWorkflows() {
    const repo = getDataSource().getRepository(WorkflowEntity);

    if (!fs.existsSync(CONFIG.LEGACY_WORKFLOWS_DIR)) {
        console.error(`[import-workflows] workflow directory not found: ${CONFIG.LEGACY_WORKFLOWS_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(CONFIG.LEGACY_WORKFLOWS_DIR).filter(f => f.endsWith('.json') || f.endsWith('.jsonc'));
    if (files.length === 0) {
        console.log('[import-workflows] no workflow files found');
        return;
    }

    for (const file of files) {
        const fp = path.join(CONFIG.LEGACY_WORKFLOWS_DIR, file);
        try {
            const wf = await readJsoncFile(fp);
            if (!wf) {
                console.warn(`[import-workflows] skipped (no id): ${file}`);
                continue;
            }
            const entity = repo.create({
                id: wf.id,
                name: wf.pretty_name || wf.id,
                version: wf.version || '1.0.0',
                description: wf.description || null,
                enabled: wf.enabled !== false,
                triggers: wf.triggers || [],
                actions: wf.actions || []
            });
            await repo.save(entity);
            console.log(`[import-workflows] imported ${wf.id}`);
        } catch (err: any) {
            console.error(`[import-workflows] failed ${file}:`, err?.message || err);
        }
    }
}
