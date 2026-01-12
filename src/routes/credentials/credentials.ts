import * as express from 'express';
import { requireAdmin, requireAuth } from '../../middleware/user.js';
import { addOwnerTeamToCredential, addOwnerToCredential, addUserTeamToCredential, addUserToCredential, deleteCredential, getCredentialsByUserId, getPublicCredentials, isCredentialOwner, isCredentialUser, listCredentials, loadCredential, removeOwnerFromCredential, removeOwnerTeamFromCredential, removeUserFromCredential, removeUserTeamFromCredential, saveCredential } from '../../services/credentialStore.js';
import { getUserById } from '../../services/userStore.js';
import { hasPerms, PERMISSIONS } from '../../services/permissions.js';

const router = express.Router();

const normalizeParam = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
};

async function getPublicCredentialsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        const creds = await getPublicCredentials();
        if (!creds || creds.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ credentials: creds });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function getUserCredentialsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const creds = await getCredentialsByUserId(req.user!.sub);
        if (!creds || creds.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ credentials: creds });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function getAllCredentialsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        const creds = await listCredentials();
        if (!creds || creds.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ credentials: creds });
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
async function getCredentialHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const credentialId = normalizeParam(req.params?.id);
        if (!credentialId) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        const wf = await loadCredential(credentialId);
        if (!wf) {
            return res.status(404).json({ error: 'not found' });
        }
        if (!(await isCredentialUser(wf.id, req.user!.sub))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return res.status(200).json(wf);
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
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
async function postCredentialHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const saved = await saveCredential(req.body, req.user!.sub);
        return res.status(201).json(saved);
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function putCredentialHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const credentialId = normalizeParam(req.params?.id);
        if (!credentialId) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        const credential = await loadCredential(credentialId);
        if (!credential) {
            return res.status(404).json({ error: 'not found' });
        }
        const actor = await getUserById(req.user!.sub);
        const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
        if (!(await isCredentialOwner(credentialId, req.user!.sub)) && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        if (req.body?.id && String(req.body.id) !== String(credentialId)) {
            return res.status(400).json({ error: 'Credential id mismatch' });
        }
        const updated = await saveCredential({ ...req.body, id: credentialId });
        return res.status(200).json(updated);
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function deleteCredentialHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const credentialId = normalizeParam(req.params?.id);
        if (!credentialId) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        const credential = await loadCredential(credentialId);
        if (!credential) {
            return res.status(404).json({ error: 'not found' });
        }
        const actor = await getUserById(req.user!.sub);
        const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
        if (!(await isCredentialOwner(credentialId, req.user!.sub)) && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const deleted = await deleteCredential(credentialId);
        if (!deleted) {
            return res.status(500).json({ error: 'Internal error' });
        }
        return res.status(200).json({ message: 'Credential deleted' });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

router.get('/credentials', requireAuth, getUserCredentialsHandler);
router.get('/credentials/all', requireAuth, requireAdmin, getAllCredentialsHandler);
router.get('/credentials/public', requireAuth, getPublicCredentialsHandler);
router.post('/credentials', requireAuth, postCredentialHandler);
router.get('/credentials/:id', requireAuth, getCredentialHandler);
router.put('/credentials/:id', requireAuth, putCredentialHandler);
router.delete('/credentials/:id', requireAuth, deleteCredentialHandler);
router.post('/credentials/:id/users', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const credentialId = normalizeParam(req.params?.id);
    const userId = normalizeParam(req.body?.userId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!credentialId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isCredentialOwner(credentialId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addUserToCredential(credentialId, userId);
    if (!updated) return res.status(404).json({ error: 'Credential or user not found' });
    return res.status(200).json(updated);
});

router.delete('/credentials/:id/users/:userId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const credentialId = normalizeParam(req.params?.id);
    const userId = normalizeParam(req.params?.userId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!credentialId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isCredentialOwner(credentialId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeUserFromCredential(credentialId, userId);
    if (!updated) return res.status(404).json({ error: 'Credential not found' });
    return res.status(200).json(updated);
});

router.post('/credentials/:id/owners', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const credentialId = normalizeParam(req.params?.id);
    const userId = normalizeParam(req.body?.userId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!credentialId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isCredentialOwner(credentialId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addOwnerToCredential(credentialId, userId);
    if (!updated) return res.status(404).json({ error: 'Credential or user not found' });
    return res.status(200).json(updated);
});

router.delete('/credentials/:id/owners/:userId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const credentialId = normalizeParam(req.params?.id);
    const userId = normalizeParam(req.params?.userId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!credentialId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isCredentialOwner(credentialId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeOwnerFromCredential(credentialId, userId);
    if (!updated) return res.status(404).json({ error: 'Credential not found' });
    return res.status(200).json(updated);
});

router.post('/credentials/:id/user-teams', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const credentialId = normalizeParam(req.params?.id);
    const teamId = normalizeParam(req.body?.teamId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!credentialId || !teamId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isCredentialOwner(credentialId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addUserTeamToCredential(credentialId, teamId);
    if (!updated) return res.status(404).json({ error: 'Credential or team not found' });
    return res.status(200).json(updated);
});

router.delete('/credentials/:id/user-teams/:teamId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const credentialId = normalizeParam(req.params?.id);
    const teamId = normalizeParam(req.params?.teamId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!credentialId || !teamId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isCredentialOwner(credentialId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeUserTeamFromCredential(credentialId, teamId);
    if (!updated) return res.status(404).json({ error: 'Credential not found' });
    return res.status(200).json(updated);
});

router.post('/credentials/:id/owner-teams', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const credentialId = normalizeParam(req.params?.id);
    const teamId = normalizeParam(req.body?.teamId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!credentialId || !teamId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isCredentialOwner(credentialId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addOwnerTeamToCredential(credentialId, teamId);
    if (!updated) return res.status(404).json({ error: 'Credential or team not found' });
    return res.status(200).json(updated);
});

router.delete('/credentials/:id/owner-teams/:teamId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const credentialId = normalizeParam(req.params?.id);
    const teamId = normalizeParam(req.params?.teamId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!credentialId || !teamId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isCredentialOwner(credentialId, actorId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeOwnerTeamFromCredential(credentialId, teamId);
    if (!updated) return res.status(404).json({ error: 'Credential not found' });
    return res.status(200).json(updated);
});

export default router;
