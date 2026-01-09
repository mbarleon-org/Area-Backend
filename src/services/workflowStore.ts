import { initDataSource, getDataSource } from './dataSource.js';
import { Workflow as WorkflowEntity } from '../db/types/workflow.js';
import * as fs from 'fs';
import * as path from 'path';
import { getUserById } from './userStore.js';
import { getTeamByID } from './teamStore.js';
import { User } from '../db/types/user.js';
import { hasPerms, PERMISSIONS } from './permissions.js';

export interface StoredWorkflow {
    id: string;
    version?: string;
    enabled?: boolean;
    pretty_name?: string;
    description?: string;
    triggers?: any[];
    actions?: any[];
    data?: JSON;
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
export async function persistWorkflowDefinition(def: StoredWorkflow, user?: User): Promise<WorkflowEntity> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const payload: Partial<WorkflowEntity> = {
        id: def.id,
        name: def.pretty_name || def.id,
        version: def.version || '1.0.0',
        description: def.description || '',
        enabled: !!def.enabled,
        triggers: def.triggers || [],
        actions: def.actions || [],
        data: def.data || JSON.parse('{}')
    };
    if (user) {
        payload.owners = [user];
    }
    const entity = repo.create(payload);
    return repo.save(entity);
}

/**
 * Save a workflow definition (create or update) and return the stored representation.
 *
 * @param {StoredWorkflow} def - workflow definition to save (must include `id`)
 * @returns {Promise<StoredWorkflow>} saved workflow
 */
export async function saveWorkflow(def: StoredWorkflow, uId?: string): Promise<StoredWorkflow> {
    if (!def?.id) {
        throw new Error('workflow id is required');
    }
    await initDataSource();
    let owner: User | undefined;
    if (uId) {
        owner = await getUserById(uId) as User | undefined;
        if (!owner) {
            throw new Error('valid user id is required for workflow creation');
        }
    }
    const versioned = { version: def.version || '1.0.0', enabled: !!def.enabled, ...def };
    const saved = await persistWorkflowDefinition(versioned, owner);
    return mapEntityToWorkflow(saved);
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

export async function getWorkflowsByTeamId(id: string) {
    const team = await getTeamByID(id);
    if (!team) {
        return [];
    }

    const workflows = team.workflows;
    const ownWorkflows = team.ownedWorkflows;

    return [...new Set([...(workflows || []), ...(ownWorkflows || [])])];
}

export async function getWorkflowsByTeamIds(ids: string[]) {
    if (!ids || ids.length === 0) {
        return [];
    }

    let workflows: WorkflowEntity[] = [];
    for (const id of ids) {
        const teamWorkflows = await getWorkflowsByTeamId(id);
        workflows = [...new Set([...(workflows || []), ...(teamWorkflows || [])])];
    }
    return workflows;
}

export async function getWorkflowsByUserId(id: string): Promise<WorkflowEntity[]> {
    const user = await getUserById(id);
    if (!user) {
        return [];
    }

    const workflows = user.workflows;
    const ownWorkflows = user.ownedWorkflows;

    let teamWorkflows: WorkflowEntity[] = [];

    const tIds = user.teams?.map(team => String(team.id));
    if (tIds) {
        teamWorkflows = teamWorkflows.concat(await getWorkflowsByTeamIds(tIds));
    }

    const otIds = user.ownedTeams?.map(team => String(team.id));
    if (otIds) {
        teamWorkflows = teamWorkflows.concat(await getWorkflowsByTeamIds(otIds));
    }

    return [...new Set([...(workflows || []), ...(ownWorkflows || []), ...(teamWorkflows || [])])]
}

export async function isWorkflowOwner(wId: string, uId: string): Promise<boolean> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const entity = await repo.findOne({
        where: { id: wId },
        relations: ['owners', 'ownerTeams']
    });

    if (!entity) {
        return false;
    }

    const user = await getUserById(uId);

    if (!entity.owners && !entity.ownerTeams) {
        return !!(user && hasPerms(user!.permissions, PERMISSIONS.ADMIN));
    }

    const ownerMatch = (entity.owners || []).some(u => String(u.id) === String(uId));
    const teamMatch = [...(user?.teams || []), ...(user?.ownedTeams || [])]
        .some(t => (entity.ownerTeams || []).some(c => c.id === t.id));
    return ownerMatch || teamMatch;
}

export async function isWorkflowUser(wId: string, uId: string): Promise<boolean> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const entity = await repo.findOne({
        where: { id: wId },
        relations: ['owners', 'users', 'ownerTeams', 'userTeams']
    });

    if (!entity) {
        return false;
    }

    const user = await getUserById(uId);

    if (!entity.owners && !entity.users && !entity.userTeams && !entity.ownerTeams) {
        return true;
    }

    const directMatch = [...(entity.users || []), ...(entity.owners || [])]
        .some(u => String(u.id) === String(uId));
    const teamMatch = [...(user?.teams || []), ...(user?.ownedTeams || [])]
        .some(t => [...(entity.userTeams || []), ...(entity.ownerTeams || [])].some(c => c.id === t.id));
    return directMatch || teamMatch;
}

export async function getPublicWorkflows(): Promise<WorkflowEntity[]> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const entities = await repo.find({ relations: ['owners', 'users', 'userTeams', 'ownerTeams'] });

    return entities.filter((e) => {
        const hasOwners = Array.isArray(e.owners) && e.owners.length > 0;
        const hasUsers = Array.isArray(e.users) && e.users.length > 0;
        const hasUserTeams = Array.isArray(e.userTeams) && e.userTeams.length > 0;
        const hasOwnerTeams = Array.isArray(e.ownerTeams) && e.ownerTeams.length > 0;
        return !(hasOwners || hasUsers || hasUserTeams || hasOwnerTeams);
    });
}

export async function getUserRunnableWorkflows(uId: string): Promise<WorkflowEntity[]> {
    return [...(await getWorkflowsByUserId(uId)), ...(await getPublicWorkflows())];
}
