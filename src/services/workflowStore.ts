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

export async function listWorkflows(): Promise<StoredWorkflow[]> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const entities = await repo.find();
    return entities.map(mapEntityToWorkflow);
}

export async function loadWorkflow(id: string): Promise<StoredWorkflow | null> {
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowEntity);
    const entity = await repo.findOne({ where: { id } });
    return entity ? mapEntityToWorkflow(entity) : null;
}

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

export async function saveWorkflow(def: StoredWorkflow): Promise<StoredWorkflow> {
    if (!def?.id) {
        throw new Error('workflow id is required');
    }
    const versioned = { version: def.version || '1.0.0', enabled: !!def.enabled, ...def };
    await persistWorkflowDefinition(versioned);
    return mapEntityToWorkflow(await getDataSource().getRepository(WorkflowEntity).findOneOrFail({ where: { id: def.id } }));
}

export async function setWorkflowEnabled(id: string, enabled: boolean): Promise<StoredWorkflow | null> {
    const existing = await loadWorkflow(id);
    if (!existing) {
        return null;
    }
    existing.enabled = enabled;
    return saveWorkflow(existing);
}

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

function stripJsonComments(input: string) {
    return input
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
}

async function readWorkflowFile(fp: string): Promise<StoredWorkflow | null> {
    const raw = await fs.promises.readFile(fp, 'utf8');
    const parsed = JSON.parse(stripJsonComments(raw));
    if (!parsed?.id) {
        return null;
    }
    return parsed as StoredWorkflow;
}

export async function seedWorkflowsFromDir(dir: string = path.resolve(process.cwd(), 'workflows')): Promise<number> {
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.jsonc'));
    let imported = 0;
    for (const file of files) {
        const fp = path.join(dir, file);
        try {
            const wf = await readWorkflowFile(fp);
            if (!wf) {
                continue;
            }
            await persistWorkflowDefinition({ enabled: wf.enabled !== false, ...wf });
            imported += 1;
        } catch (err) {
            console.error('[seedWorkflowsFromDir] failed to import', file, err);
        }
    }
    return imported;
}
