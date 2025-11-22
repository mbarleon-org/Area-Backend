import { URL } from 'url';
import { CONFIG } from '../config';
import { randomBytes } from 'crypto';
import { generateNonce } from './runnerAuth.js';
import { RunnerJob } from '../db/types/runnerJob.js';
import { ensureRedis, redis } from './redisClient.js';
import { recordWorkflowResult } from './workflowResults.js';
import { getDataSource, initDataSource } from './dataSource.js';

export interface QueueWorkflowJobOptions {
    workflowId: string;
    workflowVersion?: string;
    startedByUser?: string;
    input?: any;
    callbackBaseUrl?: string;
}

export function buildCallbackUrl(base?: string): string {
    const resolvedBase = base || CONFIG.PUBLIC_URL;
    if (!resolvedBase) {
        throw new Error('PUBLIC_URL or callback base URL must be set to queue runner jobs.');
    }
    const path = CONFIG.RUNNER_CALLBACK_PATH.startsWith('/')
        ? CONFIG.RUNNER_CALLBACK_PATH
        : `/${CONFIG.RUNNER_CALLBACK_PATH}`;
    return new URL(path, resolvedBase).toString();
}

export function newJobId(): string {
    return randomBytes(16).toString('hex');
}

export async function getRunnerJob(jobId: string): Promise<RunnerJob | null> {
    await initDataSource();
    const repo = getDataSource().getRepository(RunnerJob);
    return repo.findOne({ where: { jobId } });
}

export async function updateRunnerJob(jobId: string, patch: Partial<RunnerJob>): Promise<RunnerJob | null> {
    await initDataSource();
    const repo = getDataSource().getRepository(RunnerJob);
    const existing = await repo.findOne({ where: { jobId } });
    if (!existing) {
        return null;
    }
    const merged = repo.merge(existing, patch);
    await repo.save(merged);
    return merged;
}

export async function createRunnerJob(opts: QueueWorkflowJobOptions): Promise<RunnerJob> {
    await initDataSource();
    const repo = getDataSource().getRepository(RunnerJob);
    const job = repo.create({
        jobId: newJobId(),
        workflowId: opts.workflowId,
        workflowVersion: opts.workflowVersion,
        startedByUser: opts.startedByUser,
        input: opts.input,
        status: 'queued',
        callbackNonce: generateNonce(),
        callbackUrl: buildCallbackUrl(opts.callbackBaseUrl)
    });
    await repo.save(job);
    return job;
}

export async function enqueueRunnerJob(opts: QueueWorkflowJobOptions): Promise<RunnerJob> {
    const job = await createRunnerJob(opts);
    await ensureRedis();
    const payload = {
        jobId: job.jobId,
        workflowId: job.workflowId,
        workflowVersion: job.workflowVersion,
        startedByUser: job.startedByUser,
        input: job.input,
        callbackUrl: job.callbackUrl,
        callbackNonce: job.callbackNonce
    };
    await redis.xadd(CONFIG.WORKFLOW_STREAM, '*', 'job', JSON.stringify(payload));
    await recordWorkflowResult(job, { status: 'queued' });
    return job;
}
