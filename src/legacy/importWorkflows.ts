import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { readJsoncFile } from './readFile';
import { getDataSource } from '../services/dataSource.js';
import { Workflow as WorkflowEntity } from '../db/types/workflow';

/**
 * Ensure the configured legacy workflows directory exists.
 * Exits the process if the directory is missing.
 *
 * @param {string} dir - Path to the legacy workflows directory
 * @returns {void}
 */
function ensureWorkflowsDirExists(dir: string): void {
    if (!fs.existsSync(dir)) {
        console.error(`[import-workflows] workflow directory not found: ${dir}`);
        process.exit(1);
    }
}

/**
 * List candidate workflow files in a directory.
 *
 * @param {string} dir - Directory to read
 * @returns {string[]} array of filenames ending with .json or .jsonc
 */
function listWorkflowFiles(dir: string): string[] {
    return fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.jsonc'));
}

/**
 * Read a workflow file and persist it using the repository.
 * Errors are logged but do not stop the import loop.
 *
 * @param {string} filePath - Absolute path to the workflow file
 * @param {any} repo - TypeORM repository for the Workflow entity
 * @returns {Promise<void>} resolves when the file is processed
 */
async function processWorkflowFile(filePath: string, repo: any): Promise<void> {
    const fileName = path.basename(filePath);
    try {
        const wf = await readJsoncFile(filePath);
        if (!wf) {
            console.warn(`[import-workflows] skipped (no id): ${fileName}`);
            return;
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
        console.error(`[import-workflows] failed ${fileName}:`, err?.message || err);
    }
}

/**
 * Import legacy workflows from the configured directory.
 *
 * @returns {Promise<void>} resolves when import completes
 */
export async function importLegacyWorkflows(): Promise<void> {
    const repo = getDataSource().getRepository(WorkflowEntity);
    const dir = CONFIG.LEGACY_WORKFLOWS_DIR as string;

    ensureWorkflowsDirExists(dir);

    const files = listWorkflowFiles(dir);
    if (files.length === 0) {
        console.log('[import-workflows] no workflow files found');
        return;
    }

    for (const file of files) {
        const fp = path.join(dir, file);
        await processWorkflowFile(fp, repo);
    }
}
