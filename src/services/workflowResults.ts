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

export async function recordWorkflowResult(job: RunnerJobLike, payload: RunnerCallbackPayload) {
    const wf = await ensureWorkflowPersisted(job.workflowId);
    await initDataSource();
    const repo = getDataSource().getRepository(WorkflowResult);
    const existing = await repo.findOne({ where: { jobId: job.jobId } });

    const base = {
        workflow: wf ? ({ id: wf.id } as any) : ({ id: job.workflowId } as any),
        workflowVersion: job.workflowVersion || wf?.version || '1.0.0',
        triggers: wf?.triggers || [],
        actions: wf?.actions || [],
        results: payload?.result ?? null,
        errorMessage: payload?.errorMessage,
        status: payload?.status || 'queued'
    };

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
        jobId: job.jobId
    });

    await repo.save(result);
    return result;
}
