import * as express from 'express';
import { requireAdmin, requireAuth } from '../../middleware/user.js';
import { getCredentialsByUserId, getPublicCredentials, isCredentialUser, listCredentials, loadCredential, saveCredential } from '../../services/credentialStore.js';

const router = express.Router();

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
        if (!req.params.id) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        const wf = await loadCredential(req.params.id);
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

router.get('/credentials', requireAuth, getUserCredentialsHandler);
router.get('/credentials/all', requireAuth, requireAdmin, getAllCredentialsHandler);
router.get('/credentials/public', requireAuth, getPublicCredentialsHandler);
router.post('/credentials', requireAuth, postCredentialHandler);
router.get('/credentials/:id', requireAuth, getCredentialHandler);

export default router;
