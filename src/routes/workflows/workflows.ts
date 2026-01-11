import * as express from 'express';
import { requireAdmin, requireAuth } from '../../middleware/user.js';
import { registerWorkflows } from '../../api/workflowRegistration.js';
import { addOwnerTeamToWorkflow, addOwnerToWorkflow, addUserTeamToWorkflow, addUserToWorkflow, deleteWorkflow, getPublicWorkflows, getWorkflowsByUserId, isWorkflowOwner, isWorkflowUser, listWorkflows, loadWorkflow, removeOwnerFromWorkflow, removeOwnerTeamFromWorkflow, removeUserFromWorkflow, removeUserTeamFromWorkflow, saveWorkflow, setWorkflowEnabled } from '../../services/workflowStore.js';
import { getUserById } from '../../services/userStore.js';
import { hasPerms, PERMISSIONS } from '../../services/permissions.js';

const router = express.Router();

async function getPublicWorkflowsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        const wfs = await getPublicWorkflows();
        if (!wfs || wfs.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ workflows: wfs });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function getUserWorkflowsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const wfs = await getWorkflowsByUserId(req.user!.sub);
        if (!wfs || wfs.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ workflows: wfs });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function getAllWorkflowsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        const wfs = await listWorkflows();
        if (!wfs || wfs.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ workflows: wfs });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
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
        if (!(await isWorkflowUser(wf.id, req.user!.sub))) {
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
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const saved = await saveWorkflow(req.body, req.user!.sub);
        registerWorkflows({});
        return res.status(201).json(saved);
    } catch (err: any) {
        return res.status(400).json({ error: err?.message || 'invalid_workflow' });
    }
}

async function putWorkflowHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const workflowId = req.params?.id;
        if (!workflowId) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        const existing = await loadWorkflow(workflowId);
        if (!existing) {
            return res.status(404).json({ error: 'not found' });
        }
        const actor = await getUserById(req.user!.sub);
        const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
        if (!(await isWorkflowOwner(workflowId, req.user!.sub)) && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (req.body?.id && String(req.body.id) !== String(workflowId)) {
            return res.status(400).json({ error: 'Workflow id mismatch' });
        }
        const saved = await saveWorkflow({ ...req.body, id: workflowId });
        registerWorkflows({});
        return res.status(200).json(saved);
    } catch (err: any) {
        return res.status(400).json({ error: err?.message || 'invalid_workflow' });
    }
}

async function deleteWorkflowHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const workflowId = req.params?.id;
        if (!workflowId) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        const existing = await loadWorkflow(workflowId);
        if (!existing) {
            return res.status(404).json({ error: 'not found' });
        }
        const actor = await getUserById(req.user!.sub);
        const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
        if (!(await isWorkflowOwner(workflowId, req.user!.sub)) && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const deleted = await deleteWorkflow(workflowId);
        if (!deleted) {
            return res.status(500).json({ error: 'Internal error' });
        }
        registerWorkflows({});
        return res.status(200).json({ message: 'Workflow deleted' });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
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

    if (!uId || !wId || !(await isWorkflowOwner(wId, uId))) {
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

    if (!uId || !wId || !(await isWorkflowOwner(wId, uId))) {
        return res.status(401).json({ error: "unauthorized" });
    }
    const wf = await setWorkflowEnabled(wId, false);
    if (!wf) {
        return res.status(404).json({ error: 'not_found' });
    }
    return res.json(wf);
}

router.get('/workflows/public', requireAuth, getPublicWorkflowsHandler);
router.get('/workflows', requireAuth, getUserWorkflowsHandler);
router.get('/workflows/all', requireAuth, requireAdmin, getAllWorkflowsHandler);
router.post('/workflows', requireAuth, postWorkflowHandler);
router.get('/workflows/:id', requireAuth, getWorkflowHandler);
router.put('/workflows/:id', requireAuth, putWorkflowHandler);
router.delete('/workflows/:id', requireAuth, deleteWorkflowHandler);
router.post('/workflows/:id/users', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const workflowId = req.params?.id;
    const userId = req.body?.userId;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workflowId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isWorkflowOwner(workflowId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addUserToWorkflow(workflowId, userId);
    if (!updated) return res.status(404).json({ error: 'Workflow or user not found' });
    return res.status(200).json(updated);
});

router.delete('/workflows/:id/users/:userId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const workflowId = req.params?.id;
    const userId = req.params?.userId;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workflowId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isWorkflowOwner(workflowId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeUserFromWorkflow(workflowId, userId);
    if (!updated) return res.status(404).json({ error: 'Workflow not found' });
    return res.status(200).json(updated);
});

router.post('/workflows/:id/owners', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const workflowId = req.params?.id;
    const userId = req.body?.userId;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workflowId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isWorkflowOwner(workflowId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addOwnerToWorkflow(workflowId, userId);
    if (!updated) return res.status(404).json({ error: 'Workflow or user not found' });
    registerWorkflows({});
    return res.status(200).json(updated);
});

router.delete('/workflows/:id/owners/:userId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const workflowId = req.params?.id;
    const userId = req.params?.userId;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workflowId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isWorkflowOwner(workflowId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeOwnerFromWorkflow(workflowId, userId);
    if (!updated) return res.status(404).json({ error: 'Workflow not found' });
    registerWorkflows({});
    return res.status(200).json(updated);
});

router.post('/workflows/:id/user-teams', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const workflowId = req.params?.id;
    const teamId = req.body?.teamId;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workflowId || !teamId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isWorkflowOwner(workflowId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addUserTeamToWorkflow(workflowId, teamId);
    if (!updated) return res.status(404).json({ error: 'Workflow or team not found' });
    registerWorkflows({});
    return res.status(200).json(updated);
});

router.delete('/workflows/:id/user-teams/:teamId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const workflowId = req.params?.id;
    const teamId = req.params?.teamId;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workflowId || !teamId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isWorkflowOwner(workflowId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeUserTeamFromWorkflow(workflowId, teamId);
    if (!updated) return res.status(404).json({ error: 'Workflow not found' });
    registerWorkflows({});
    return res.status(200).json(updated);
});

router.post('/workflows/:id/owner-teams', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const workflowId = req.params?.id;
    const teamId = req.body?.teamId;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workflowId || !teamId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isWorkflowOwner(workflowId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addOwnerTeamToWorkflow(workflowId, teamId);
    if (!updated) return res.status(404).json({ error: 'Workflow or team not found' });
    registerWorkflows({});
    return res.status(200).json(updated);
});

router.delete('/workflows/:id/owner-teams/:teamId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const workflowId = req.params?.id;
    const teamId = req.params?.teamId;
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!workflowId || !teamId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isWorkflowOwner(workflowId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeOwnerTeamFromWorkflow(workflowId, teamId);
    if (!updated) return res.status(404).json({ error: 'Workflow not found' });
    registerWorkflows({});
    return res.status(200).json(updated);
});
router.post('/workflows/:id/enable', requireAuth, enableWorkflowHandler);
router.post('/workflows/:id/disable', requireAuth, disableWorkflowHandler);

export default router;
