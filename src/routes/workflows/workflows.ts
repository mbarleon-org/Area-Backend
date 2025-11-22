import * as express from 'express';
import { listWorkflows, loadWorkflow, saveWorkflow, setWorkflowEnabled } from '../../services/workflowStore.js';

const router = express.Router();

/**
 * Handler for `GET /workflows`.
 * Lists all workflows from the store.
 *
 * @param {express.Request} _req - Express request (unused)
 * @param {express.Response} res - Express response
 * @returns {Promise<express.Response>} JSON response with `{ workflows }`
 */
async function listWorkflowsHandler(_req: express.Request, res: express.Response): Promise<any> {
    const items = await listWorkflows();
    return res.json({ workflows: items });
}

/**
 * Handler for `GET /workflows/:id`.
 * Loads a single workflow by id and returns 404 when not found.
 *
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @returns {Promise<express.Response>} workflow object or 404
 */
async function getWorkflowHandler(req: express.Request, res: express.Response): Promise<any> {
    const wf = await loadWorkflow(req.params.id);
    if (!wf) return res.status(404).json({ error: 'not_found' });
    return res.json(wf);
}

/**
 * Handler for `POST /workflows`.
 * Saves a workflow and returns it with HTTP 201 on success or 400 on error.
 *
 * @param {express.Request} req - Express request with workflow in `req.body`
 * @param {express.Response} res - Express response
 * @returns {Promise<express.Response>} saved workflow or error
 */
async function postWorkflowHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        const saved = await saveWorkflow(req.body);
        return res.status(201).json(saved);
    } catch (err: any) {
        return res.status(400).json({ error: err?.message || 'invalid_workflow' });
    }
}

/**
 * Handler for `POST /workflows/:id/enable`.
 * Toggles a workflow on (enabled=true) and returns the updated workflow or 404 if not found.
 *
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @returns {Promise<express.Response>} updated workflow or 404
 */
async function enableWorkflowHandler(req: express.Request, res: express.Response): Promise<any> {
    const wf = await setWorkflowEnabled(req.params.id, true);
    if (!wf) return res.status(404).json({ error: 'not_found' });
    return res.json(wf);
}

/**
 * Handler for `POST /workflows/:id/disable`.
 * Toggles a workflow off (enabled=false) and returns the updated workflow or 404 if not found.
 *
 * @param {express.Request} req - Express request
 * @param {express.Response} res - Express response
 * @returns {Promise<express.Response>} updated workflow or 404
 */
async function disableWorkflowHandler(req: express.Request, res: express.Response): Promise<any> {
    const wf = await setWorkflowEnabled(req.params.id, false);
    if (!wf) return res.status(404).json({ error: 'not_found' });
    return res.json(wf);
}

router.get('/workflows', listWorkflowsHandler);
router.get('/workflows/:id', getWorkflowHandler);
router.post('/workflows', postWorkflowHandler);
router.post('/workflows/:id/enable', enableWorkflowHandler);
router.post('/workflows/:id/disable', disableWorkflowHandler);

export default router;
