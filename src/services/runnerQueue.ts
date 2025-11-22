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

/**
 * Build the absolute callback URL used by runners to post job status updates.
 *
 * @param {string} [base] - Optional base URL override (falls back to `CONFIG.PUBLIC_URL`)
 * @returns {string} fully-qualified callback URL
 * @throws {Error} when neither `base` nor `CONFIG.PUBLIC_URL` is configured
 */
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

/**
 * Helper: initialize datasource and return the RunnerJob repository.
 *
 * @returns {Promise<any>} repository for `RunnerJob` (TypeORM)
 */
async function getRunnerJobRepository(): Promise<any> {
    await initDataSource();
    return getDataSource().getRepository(RunnerJob);
}

/**
 * Lookup a runner job by its jobId.
 *
 * @param {string} jobId - Job identifier
 * @returns {Promise<RunnerJob|null>} the RunnerJob entity or `null` when not found
 */
export async function getRunnerJob(jobId: string): Promise<RunnerJob | null> {
    const repo = await getRunnerJobRepository();
    return repo.findOne({ where: { jobId } });
}

/**
 * Update an existing runner job with a partial patch.
 *
 * @param {string} jobId - Job identifier to update
 * @param {Partial<RunnerJob>} patch - Partial fields to merge into the job
 * @returns {Promise<RunnerJob|null>} updated job or `null` when not found
 */
export async function updateRunnerJob(jobId: string, patch: Partial<RunnerJob>): Promise<RunnerJob | null> {
    const repo = await getRunnerJobRepository();
    const existing = await repo.findOne({ where: { jobId } });
    if (!existing) {
        return null;
    }
    const merged = repo.merge(existing, patch);
    await repo.save(merged);
    return merged;
}

/**
 * Create and persist a new RunnerJob entity.
 *
 * @param {QueueWorkflowJobOptions} opts - Options describing the workflow to queue
 * @returns {Promise<RunnerJob>} the persisted RunnerJob
 */
export async function createRunnerJob(opts: QueueWorkflowJobOptions): Promise<RunnerJob> {
    const repo = await getRunnerJobRepository();
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
    const payload = buildQueuePayload(job);
    await redis.xadd(CONFIG.WORKFLOW_STREAM, '*', 'job', JSON.stringify(payload));
    await recordWorkflowResult(job, { status: 'queued' });
    return job;
}

/**
 * Build the payload that will be pushed to the workflow stream for runners.
 *
 * @param {RunnerJob} job - persisted RunnerJob entity
 * @returns {Record<string, any>} payload object to JSON-serialize into the stream
 */
function buildQueuePayload(job: RunnerJob): Record<string, any> {
    return {
        jobId: job.jobId,
        workflowId: job.workflowId,
        workflowVersion: job.workflowVersion,
        startedByUser: job.startedByUser,
        input: job.input,
        callbackUrl: job.callbackUrl,
        callbackNonce: job.callbackNonce
    };
}
