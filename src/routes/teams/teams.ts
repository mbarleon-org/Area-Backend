import * as express from 'express';
import { isAdmin } from '../../services/permissions.js';
import { getUserById } from '../../services/userStore.js';
import { requireAdmin, requireAuth } from '../../middleware/user.js';
import { getTeamByID, getTeamByName, getTeamsByUserID, isTeamMember, listTeams, saveTeam } from '../../services/teamStore.js';

const router = express.Router();

async function postTeamHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!req.body.name) {
            return res.status(400).json({ error: 'Team name needed' });
        }
        if (await getTeamByName(req.body.name)) {
            return res.status(409).json({ error: 'Team with this name alredy exists' });
        }
        const saved = await saveTeam(req.body, req.user!.sub);
        return res.status(201).json(saved);
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function getTeamsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const teams = await getTeamsByUserID(req.user!.sub);
        if (!teams || teams.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ teams: teams });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function getAllTeamsHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        const teams = await listTeams()
        if (!teams || teams.length === 0) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ teams: teams });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function getTeamByIdHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!req.params.id) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        if (!(await isTeamMember(req.user!.sub, req.params.id)) && !isAdmin((await getUserById(req.user!.sub))?.permissions || 0)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const team = await getTeamByID(req.params.id);
        if (!team) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ team: team });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}


router.post('/teams', requireAuth, postTeamHandler);
router.get('/teams', requireAuth, getTeamsHandler);
router.get('/teams/all', requireAuth, requireAdmin, getAllTeamsHandler);
router.get('/teams/:id', requireAuth, getTeamByIdHandler);

export default router;
