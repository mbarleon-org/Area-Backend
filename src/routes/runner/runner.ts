import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import { CONFIG } from '../../config';
import { listModuleFiles } from '../../services/moduleFiles.js';
import { verifyRunnerToken } from '../../services/runnerAuth.js';
import { loadModuleCatalog } from '../../services/moduleCatalog.js';
import { getCredentialsByIds } from '../../services/credentialStore.js';
import { recordWorkflowResult } from '../../services/workflowResults.js';
import { getRunnerJob, updateRunnerJob } from '../../services/runnerQueue.js';
import { extractCredentialIds, loadWorkflow } from '../../services/workflowStore.js';

const router = express.Router();

async function authenticateRunner(req: express.Request, res: express.Response, next: express.NextFunction) {
    const jobId = String(req.headers['x-runner-job'] || '') || String((req.query.jobId as string) || '');
    const token = String(req.headers['x-runner-token'] || '');
    if (!jobId) {
        return res.status(401).json({ error: 'missing_runner_job' });
    }
    const job = await getRunnerJob(jobId);
    if (!job) {
        return res.status(404).json({ error: 'job_not_found' });
    }
    if (!verifyRunnerToken(job.callbackNonce, token)) {
        return res.status(403).json({ error: 'invalid_runner_token' });
    }
    (req as any).runnerJob = job;
    return next();
}

router.get('/runner/workflows/:id', authenticateRunner, async (req, res) => {
    const workflowId = req.params.id;
    const job = (req as any).runnerJob;
    if (job && job.workflowId !== workflowId) {
        return res.status(403).json({ error: 'job_workflow_mismatch' });
    }
    const wf = await loadWorkflow(workflowId);
    if (!wf || wf.enabled === false) {
        return res.status(404).json({ error: 'workflow not found or disabled' });
    }
    await updateRunnerJob(job.jobId, { status: 'running' });

    const credentialIds = extractCredentialIds(wf);
    const modulesUrl = `${CONFIG.BASE_PATH.replace(/\/$/, '')}/runner/modules`;

    return res.json({
        workflow: wf,
        version: wf.version,
        credentialIds,
        modulesUrl
    });
});

router.post('/runner/credentials', authenticateRunner, async (req, res) => {
    const job = (req as any).runnerJob;
    const body = (req.body || {}) as { credentialIds?: string[] };
    const credentialIds = Array.isArray(body.credentialIds) ? body.credentialIds : [];
    if (credentialIds.length === 0) {
        return res.json({ credentials: {} });
    }

    const credentials = await getCredentialsByIds(credentialIds);
    if (job) {
        await updateRunnerJob(job.jobId, { status: 'running' });
    }

    const payload: Record<string, any> = {};
    for (const cred of Object.values(credentials)) {
        payload[cred.id] = { type: cred.type, data: cred.data, name: cred.name };
    }

    return res.json({ credentials: payload });
});

router.get('/runner/modules', async (_req, res) => {
    const registry = loadModuleCatalog();
    return res.json({ modules: registry.modules || {} });
});

router.get('/runner/modules/manifest', authenticateRunner, (_req, res) => {
    const modulesDir = path.resolve(process.cwd(), 'dist', 'modules');
    const fallbackDir = path.resolve(process.cwd(), 'src', 'modules');
    const baseDir = fs.existsSync(modulesDir) ? modulesDir : fallbackDir;
    if (!fs.existsSync(baseDir)) {
        return res.json({ files: [] });
    }
    const files = listModuleFiles(baseDir);
    return res.json({ files });
});

router.use('/runner/modules/files', authenticateRunner, express.static(path.resolve(process.cwd(), 'dist', 'modules')));
router.use('/runner/modules/files', authenticateRunner, express.static(path.resolve(process.cwd(), 'src', 'modules')));

router.post('/runner/callback', authenticateRunner, async (req, res) => {
    const job = (req as any).runnerJob;
    if (req.body && req.body.jobId && req.body.jobId !== job.jobId) {
        return res.status(400).json({ error: 'job_mismatch' });
    }
    const status = String((req.body || {}).status || '');
    if (!status) {
        return res.status(400).json({ error: 'missing_status' });
    }
    const allowed = new Set(['running', 'succeeded', 'failed']);
    if (!allowed.has(status)) {
        return res.status(400).json({ error: 'invalid_status' });
    }

    const patch: any = { status };
    if (req.body.result !== undefined) {
        patch.result = req.body.result;
    }
    if (req.body.errorMessage) {
        patch.errorMessage = req.body.errorMessage;
    }
    await updateRunnerJob(job.jobId, patch);
    await recordWorkflowResult(job, { status, result: req.body.result, errorMessage: req.body.errorMessage });
    return res.json({ ok: true });
});

export default router;
