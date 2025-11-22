import { WorkflowResult } from '../db/types/workflowResult.js';
import { getDataSource, initDataSource } from './dataSource.js';
import { loadWorkflow, persistWorkflowDefinition, StoredWorkflow } from './workflowStore.js';

export interface RunnerCallbackPayload {
    status: string;
    result?: any;
    errorMessage?: string;
}

export interface RunnerJobLike {
    jobId: string;
    workflowId: string;
    workflowVersion?: string;
}

async function ensureWorkflowPersisted(workflowId: string): Promise<StoredWorkflow | null> {
    const wf = await loadWorkflow(workflowId);
    if (wf) {
        await persistWorkflowDefinition(wf);
    }
    return wf;
}
/**
 * Build the base payload to be persisted in `WorkflowResult` from the job, optional workflow, and callback payload.
 *
 * @param {RunnerJobLike} job - Job-like object containing job/workflow identifiers
 * @param {RunnerCallbackPayload} payload - Callback payload sent by runner
 * @param {StoredWorkflow | null} wf - Optionally loaded workflow definition
 * @returns {Record<string, any>} normalized base object to save on the WorkflowResult entity
 */
function buildResultBase(job: RunnerJobLike, payload: RunnerCallbackPayload, wf: StoredWorkflow | null): Record<string, any> {
    return {
        workflow: wf ? ({ id: wf.id } as any) : ({ id: job.workflowId } as any),
        workflowVersion: job.workflowVersion || wf?.version || '1.0.0',
        triggers: wf?.triggers || [],
        actions: wf?.actions || [],
        results: payload?.result ?? null,
        errorMessage: payload?.errorMessage,
        status: payload?.status || 'queued'
    };
}

/**
 * Persist the workflow result either by updating an existing entity or creating a new one.
 * Preserves the original update semantics (merge then set individual fields when updating).
 *
 * @param {any} repo - TypeORM repository for `WorkflowResult`
 * @param {any|null} existing - Existing entity when present
 * @param {Record<string, any>} base - Base payload to persist
 * @param {string} jobId - Runner job id to associate with the result when creating
 * @returns {Promise<any>} the saved WorkflowResult entity
 */
async function persistResult(repo: any, existing: any | null, base: Record<string, any>, jobId: string): Promise<any> {
    if (existing) {
        repo.merge(existing, base);
        existing.results = base.results;
        existing.errorMessage = base.errorMessage;
        existing.status = base.status;
        await repo.save(existing);
        return existing;
    }

    const result = repo.create({
        ...base,
        jobId
    });

    await repo.save(result);
    return result;
}

/**
 * Record the result of a runner-executed workflow. This ensures the workflow definition
 * is persisted, then saves or updates a `WorkflowResult` entry with the provided payload.
 *
 * @param {RunnerJobLike} job - Job metadata (jobId, workflowId, optional version)
 * @param {RunnerCallbackPayload} payload - Payload from the runner callback
 * @returns {Promise<any>} saved `WorkflowResult` entity
 */
export async function recordWorkflowResult(job: RunnerJobLike, payload: RunnerCallbackPayload): Promise<any> {
    const wf = await ensureWorkflowPersisted(job.workflowId);
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowResult);
    const existing = await repo.findOne({ where: { jobId: job.jobId } });

    const base = buildResultBase(job, payload, wf);
    return persistResult(repo, existing, base, job.jobId);
}

/**
 * Poll for a persisted WorkflowResult associated with a runner job until it reaches
 * a terminal state (`succeeded` or `failed`) or the timeout elapses.
 *
 * @param {string} jobId - runner job id to wait for
 * @param {number} [timeoutMs=15000] - total time to wait in milliseconds
 * @param {number} [pollIntervalMs=200] - interval between polls in milliseconds
 * @returns {Promise<any|null>} the WorkflowResult entity when terminal, or null on timeout
 */
export async function waitForJobResult(jobId: string, timeoutMs = 15000, pollIntervalMs = 200): Promise<any | null> {
    const stopAt = Date.now() + timeoutMs;
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowResult);

    while (Date.now() < stopAt) {
        const existing = await repo.findOne({ where: { jobId } });
        if (existing && existing.status && existing.status !== 'queued' && existing.status !== 'running') {
            return existing;
        }
        if (existing && existing.status === 'failed') {
            return existing;
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
    return null;
}
