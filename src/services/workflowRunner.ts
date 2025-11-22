import { CONFIG } from '../config';
import type * as express from 'express';
import { executeActions } from '../api/engine.js';
import { requireRunnerSecret } from './runnerAuth.js';
import { extractCredentialIds } from './workflowStore.js';
import { getCredentialsByIds } from './credentialStore.js';
import { recordWorkflowResult } from './workflowResults.js';
import { enqueueRunnerJob, newJobId } from './runnerQueue.js';

export interface WorkflowRunContext {
    wf: any;
    actionsList: any[];
    registry: any;
    triggerOutputs: any;
    initialNodeOutputs: Record<string, any>;
    options?: any;
    req?: express.Request | null;
}

function resolveCallbackBase(req?: express.Request | null): string | undefined {
    if (CONFIG.PUBLIC_URL) {
        return CONFIG.PUBLIC_URL;
    }
    if (req && req.get && req.get('host')) {
        return `${req.protocol}://${req.get('host')}`;
    }
    return `http://localhost:${CONFIG.LISTEN_ADDRESS}`;
}

export async function dispatchWorkflow(ctx: WorkflowRunContext) {
    if (CONFIG.USE_RUNNERS) {
        requireRunnerSecret();
        const job = await enqueueRunnerJob({
            workflowId: ctx.wf.id,
            workflowVersion: ctx.wf.version,
            input: {
                triggerOutputs: ctx.triggerOutputs,
                initialNodeOutputs: ctx.initialNodeOutputs
            },
            callbackBaseUrl: resolveCallbackBase(ctx.req)
        });
        return { queued: true, jobId: job.jobId };
    }

    const jobRef = { jobId: `local-${newJobId()}`, workflowId: ctx.wf.id, workflowVersion: ctx.wf.version };
    try {
        const execOptions = Object.assign({}, ctx.options || {});
        if (typeof execOptions.getCredentialById !== 'function') {
            try {
                const credIds = extractCredentialIds(ctx.wf || {});
                const credsMap: Record<string, any> = Object.create(null);
                if (credIds && credIds.length > 0) {
                    const fetched = await getCredentialsByIds(credIds);
                    for (const c of Object.values(fetched)) {
                        const id = String((c as any).id);
                        credsMap[id] = { type: (c as any).type, data: (c as any).data || (c as any).credential, name: (c as any).name };
                    }
                }
                execOptions.getCredentialById = async (credentialId: string) => {
                    if (credsMap[String(credentialId)]) {
                        return credsMap[String(credentialId)];
                    }
                    const asNum = Number(credentialId);
                    if (!Number.isNaN(asNum) && credsMap[String(asNum)]) {
                        return credsMap[String(asNum)];
                    }
                    return null;
                };
            } catch (e) {
                execOptions.getCredentialById = async (_id: string) => null;
            }
        }

        const outputs = await executeActions(ctx.actionsList, ctx.req || null, ctx.triggerOutputs, ctx.initialNodeOutputs, ctx.wf, ctx.registry, execOptions);
        await recordWorkflowResult(jobRef, { status: 'succeeded', result: outputs });
        return { queued: false, outputs };
    } catch (err: any) {
        await recordWorkflowResult(jobRef, { status: 'failed', errorMessage: err?.message || String(err) });
        throw err;
    }
}
