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

/**
 * Middleware to authenticate a runner request.
 * It extracts the job id and token from headers (or query), verifies the job exists
 * and the provided token matches the job's callback nonce. On success it attaches
 * the job to `req.runnerJob` and calls `next()`; otherwise it sends an appropriate HTTP error.
 *
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @param {express.NextFunction} next - Express next middleware function
 * @returns {Promise<any>} calls next() on success or sends an error response
 */
async function authenticateRunner(req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> {
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

/**
 * Handler for `GET /runner/workflows/:id`.
 * Loads the workflow, validates it is enabled and that the authenticated job matches the workflow,
 * updates the runner job status to `running`, and responds with workflow metadata.
 *
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @returns {Promise<express.Response>} JSON response containing workflow metadata or an error
 */
async function getWorkflowHandler(req: express.Request, res: express.Response): Promise<any> {
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
}

/**
 * Build a credentials payload mapping id -> { type, data, name } from a credentials map.
 *
 * @param {Record<string, any>} credentials - Map of credential objects
 * @returns {Record<string, any>} flattened credentials payload
 */
function buildCredentialsPayload(credentials: Record<string, any>): Record<string, any> {
    const payload: Record<string, any> = {};
    for (const cred of Object.values(credentials)) {
        payload[cred.id] = { type: cred.type, data: cred.data, name: cred.name };
    }
    return payload;
}

/**
 * Handler for `POST /runner/credentials`.
 * Returns requested credentials to an authenticated runner and updates job status to `running`.
 *
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @returns {Promise<express.Response>} JSON response with `credentials` map
 */
async function postCredentialsHandler(req: express.Request, res: express.Response): Promise<any> {
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

    const payload = buildCredentialsPayload(credentials);

    return res.json({ credentials: payload });
}


/**
 * Handler for `GET /runner/modules`.
 * Responds with the current module catalog.
 *
 * @param {express.Request} _req - Express request (unused)
 * @param {express.Response} res - Express response
 * @returns {express.Response} JSON response with `modules`
 */
function getModulesHandler(_req: express.Request, res: express.Response): any {
    const registry = loadModuleCatalog();
    return res.json({ modules: registry.modules || {} });
}

/**
 * Resolve the modules base directory by preferring the built `dist` path then falling back to `src`.
 *
 * @returns {string} the resolved modules base directory
 */
function resolveModulesBaseDir(): string {
    const modulesDir = path.resolve(process.cwd(), 'dist', 'modules');
    const fallbackDir = path.resolve(process.cwd(), 'src', 'modules');
    return fs.existsSync(modulesDir) ? modulesDir : fallbackDir;
}

/**
 * Handler for `GET /runner/modules/manifest`.
 * Lists module files in the resolved modules directory (authenticated).
 *
 * @param {express.Request} _req - Express request (unused)
 * @param {express.Response} res - Express response
 * @returns {express.Response} JSON response with `files`
 */
function getModulesManifestHandler(_req: express.Request, res: express.Response): any {
    const baseDir = resolveModulesBaseDir();
    if (!fs.existsSync(baseDir)) {
        return res.json({ files: [] });
    }
    const files = listModuleFiles(baseDir);
    return res.json({ files });
}

/**
 * Handler for `POST /runner/callback`.
 * Validates the callback payload, updates the runner job state, records the workflow result,
 * and responds with `{ ok: true }` on success.
 *
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @returns {Promise<express.Response>} JSON `{ ok: true }` or an error response
 */
async function postCallbackHandler(req: express.Request, res: express.Response): Promise<any> {
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
}

router.get('/runner/workflows/:id', authenticateRunner, getWorkflowHandler);
router.post('/runner/credentials', authenticateRunner, postCredentialsHandler);
router.get('/runner/modules/manifest', authenticateRunner, getModulesManifestHandler);
router.use('/runner/modules/files', authenticateRunner, express.static(path.resolve(process.cwd(), 'dist', 'modules')));
router.use('/runner/modules/files', authenticateRunner, express.static(path.resolve(process.cwd(), 'src', 'modules')));
router.get('/runner/modules', getModulesHandler);
router.post('/runner/callback', authenticateRunner, postCallbackHandler);

export default router;
