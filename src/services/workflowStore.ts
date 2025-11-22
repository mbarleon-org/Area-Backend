import { initDataSource, getDataSource } from './dataSource.js';
import { Workflow as WorkflowEntity } from '../db/types/workflow.js';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredWorkflow {
    id: string;
    version?: string;
    enabled?: boolean;
    pretty_name?: string;
    description?: string;
    triggers?: any[];
    actions?: any[];
    [key: string]: any;
}
/**
 * Map a `WorkflowEntity` (DB) to the `StoredWorkflow` shape used by services.
 *
 * @param {WorkflowEntity} entity - database workflow entity
 * @returns {StoredWorkflow} normalized workflow object
 */
function mapEntityToWorkflow(entity: WorkflowEntity): StoredWorkflow {
    return {
        id: entity.id,
        version: entity.version,
        enabled: entity.enabled,
        pretty_name: entity.name,
        description: entity.description,
        triggers: entity.triggers,
        actions: entity.actions
    };
}

/**
 * List all persisted workflows from the database.
 *
 * @returns {Promise<StoredWorkflow[]>} array of stored workflows
 */
export async function listWorkflows(): Promise<StoredWorkflow[]> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const entities = await repo.find();
    return entities.map(mapEntityToWorkflow);
}

/**
 * Load a workflow by id from the database.
 *
 * @param {string} id - workflow id to load
 * @returns {Promise<StoredWorkflow|null>} stored workflow or null when not found
 */
export async function loadWorkflow(id: string): Promise<StoredWorkflow | null> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const entity = await repo.findOne({ where: { id } });
    return entity ? mapEntityToWorkflow(entity) : null;
}

/**
 * Persist a workflow definition into the database.
 *
 * @param {StoredWorkflow} def - workflow definition to persist
 * @returns {Promise<void>} resolves when saved
 */
export async function persistWorkflowDefinition(def: StoredWorkflow): Promise<void> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const entity = repo.create({
        id: def.id,
        name: def.pretty_name || def.id,
        version: def.version || '1.0.0',
        description: def.description || '',
        enabled: !!def.enabled,
        triggers: def.triggers || [],
        actions: def.actions || []
    });
    await repo.save(entity);
}

/**
 * Save a workflow definition (create or update) and return the stored representation.
 *
 * @param {StoredWorkflow} def - workflow definition to save (must include `id`)
 * @returns {Promise<StoredWorkflow>} saved workflow
 */
export async function saveWorkflow(def: StoredWorkflow): Promise<StoredWorkflow> {
    if (!def?.id) {
        throw new Error('workflow id is required');
    }
    const versioned = { version: def.version || '1.0.0', enabled: !!def.enabled, ...def };
    await persistWorkflowDefinition(versioned);
    return mapEntityToWorkflow(await getDataSource().getRepository(WorkflowEntity).findOneOrFail({ where: { id: def.id } }));
}

/**
 * Enable or disable a workflow by id.
 *
 * @param {string} id - workflow id
 * @param {boolean} enabled - desired enabled state
 * @returns {Promise<StoredWorkflow|null>} updated workflow or null when not found
 */
export async function setWorkflowEnabled(id: string, enabled: boolean): Promise<StoredWorkflow | null> {
    const existing = await loadWorkflow(id);
    if (!existing) {
        return null;
    }
    existing.enabled = enabled;
    return saveWorkflow(existing);
}

/**
 * Extract credential ids referenced by workflow actions. Returns unique ids.
 *
 * @param {StoredWorkflow} workflow - workflow to scan for credential references
 * @returns {string[]} array of credential ids (strings)
 */
export function extractCredentialIds(workflow: StoredWorkflow): string[] {
    const out = new Set<string>();
    for (const action of workflow.actions || []) {
        const credId = (action as any).credential_id || (action as any).credentialId;
        if (credId) {
            out.add(String(credId));
            continue;
        }
        const credType = (action as any).credential_type || (action as any).credentialType;
        if (credType) {
            out.add(String(credType));
        }
    }
    return Array.from(out);
}

/**
 * Remove JavaScript-style comments from a JSONC string.
 *
 * @param {string} input - raw JSONC text
 * @returns {string} text with comments removed
 */
function stripJsonComments(input: string): string {
    return input
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Read and parse a workflow file (JSON or JSONC). Returns `null` when the parsed object
 * does not contain an `id` property.
 *
 * @param {string} fp - file path to read
 * @returns {Promise<StoredWorkflow|null>} parsed workflow or null
 */
async function readWorkflowFile(fp: string): Promise<StoredWorkflow | null> {
    const raw = await fs.promises.readFile(fp, 'utf8');
    const parsed = JSON.parse(stripJsonComments(raw));
    if (!parsed?.id) {
        return null;
    }
    return parsed as StoredWorkflow;
}

/**
 * Process a single workflow file: read, validate (must contain id) and persist.
 *
 * @param {string} fp - absolute file path to process
 * @returns {Promise<boolean>} true when a workflow was persisted, false when skipped
 */
async function processWorkflowFile(fp: string): Promise<boolean> {
    const wf = await readWorkflowFile(fp);
    if (!wf) return false;
    await persistWorkflowDefinition({ enabled: wf.enabled !== false, ...wf });
    return true;
}

/**
 * Seed workflows from a directory by persisting any workflow JSON/JSONC files found.
 *
 * @param {string} [dir=path.resolve(process.cwd(),'workflows')] - directory to scan
 * @returns {Promise<number>} number of workflows imported
 */
export async function seedWorkflowsFromDir(dir: string = path.resolve(process.cwd(), 'workflows')): Promise<number> {
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.jsonc'));
    let imported = 0;
    for (const file of files) {
        const fp = path.join(dir, file);
        try {
            const ok = await processWorkflowFile(fp);
            if (ok) imported += 1;
        } catch (err) {
            console.error('[seedWorkflowsFromDir] failed to import', file, err);
        }
    }
    return imported;
}
