import * as express from 'express';
import { requireAuth } from '../../middleware/user.js';
import { getPublicWorkflows, isWorkflowOwner, isWorkflowUser, loadWorkflow, saveWorkflow, setWorkflowEnabled } from '../../services/workflowStore.js';

const router = express.Router();

async function getPublicWorkflowsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        const wfs = await getPublicWorkflows();
        if (!wfs || wfs.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ workflows: wfs });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'invalid_workflow' });
    }
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
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const wf = await loadWorkflow(req.params.id);
        if (!wf) {
            return res.status(404).json({ error: 'not found' });
        }
        if (!isWorkflowUser(wf.id, req.user!.sub)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return res.status(200).json(wf);
    } catch (err: any) {
        return res.status(400).json({ error: err?.message || 'invalid_workflow' });
    }
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
    const wId = req.params?.id;
    const uId = req.user?.sub;

    if (!uId || !wId || !isWorkflowOwner(wId, uId)) {
        return res.status(401).json({ error: "unauthorized" });
    }
    const wf = await setWorkflowEnabled(wId, true);
    if (!wf) {
        return res.status(404).json({ error: 'not_found' });
    }
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
    const wId = req.params?.id;
    const uId = req.user?.sub;

    if (!uId || !wId || !isWorkflowOwner(wId, uId)) {
        return res.status(401).json({ error: "unauthorized" });
    }
    const wf = await setWorkflowEnabled(wId, false);
    if (!wf) {
        return res.status(404).json({ error: 'not_found' });
    }
    return res.json(wf);
}

router.get('/workflows/public', requireAuth, getPublicWorkflowsHandler);
router.post('/workflows', requireAuth, postWorkflowHandler);
router.get('/workflows/:id', requireAuth, getWorkflowHandler);
router.post('/workflows/:id/enable', requireAuth, enableWorkflowHandler);
router.post('/workflows/:id/disable', requireAuth, disableWorkflowHandler);

export default router;
