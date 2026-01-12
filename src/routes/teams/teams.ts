import * as express from 'express';
import { hasPerms, PERMISSIONS } from '../../services/permissions.js';
import { getUserById } from '../../services/userStore.js';
import { requireAdmin, requireAuth } from '../../middleware/user.js';
import { addOwnerToTeam, addUserToTeam, deleteTeamById, getTeamByID, getTeamByName, getTeamsByUserID, isTeamMember, isTeamOwner, listTeams, removeOwnerFromTeam, removeUserFromTeam, saveTeam, updateTeamById } from '../../services/teamStore.js';

const router = express.Router();

const normalizeParam = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
};

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
        const teamId = normalizeParam(req.params?.id);
        if (!teamId) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        if (!(await isTeamMember(req.user!.sub, teamId)) && !hasPerms((await getUserById(req.user!.sub))?.permissions || 0, PERMISSIONS.ADMIN)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const team = await getTeamByID(teamId);
        if (!team) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ team: team });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function putTeamHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const teamId = normalizeParam(req.params?.id);
        if (!teamId) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        const team = await getTeamByID(teamId);
        if (!team) {
            return res.status(404).json({ error: 'not found' });
        }
        const actor = await getUserById(req.user!.sub);
        const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
        if (!(await isTeamOwner(req.user!.sub, teamId)) && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const name = req.body?.name;
        if (!name) {
            return res.status(400).json({ error: 'Team name needed' });
        }
        const conflict = await getTeamByName(name);
        if (conflict && String(conflict.id) !== String(teamId)) {
            return res.status(409).json({ error: 'Team with this name already exists' });
        }
        const updated = await updateTeamById(teamId, { name });
        if (!updated) {
            return res.status(404).json({ error: 'not found' });
        }
        return res.status(200).json({ team: updated });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}

async function deleteTeamHandler(req: express.Request, res: express.Response): Promise<any> {
    try {
        if (!req.user?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const teamId = normalizeParam(req.params?.id);
        if (!teamId) {
            return res.status(400).json({ error: 'Invalid request' });
        }
        const team = await getTeamByID(teamId);
        if (!team) {
            return res.status(404).json({ error: 'not found' });
        }
        const actor = await getUserById(req.user!.sub);
        const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
        if (!(await isTeamOwner(req.user!.sub, teamId)) && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const deleted = await deleteTeamById(teamId);
        if (!deleted) {
            return res.status(500).json({ error: 'Internal error' });
        }
        return res.status(200).json({ message: 'Team deleted' });
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
}


router.post('/teams', requireAuth, postTeamHandler);
router.get('/teams', requireAuth, getTeamsHandler);
router.get('/teams/all', requireAuth, requireAdmin, getAllTeamsHandler);
router.get('/teams/:id', requireAuth, getTeamByIdHandler);
router.put('/teams/:id', requireAuth, putTeamHandler);
router.delete('/teams/:id', requireAuth, deleteTeamHandler);
router.post('/teams/:id/users', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const teamId = normalizeParam(req.params?.id);
    const userId = normalizeParam(req.body?.userId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!teamId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isTeamOwner(actorId, teamId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addUserToTeam(teamId, userId);
    if (!updated) return res.status(404).json({ error: 'Team or user not found' });
    return res.status(200).json({ team: updated });
});

router.delete('/teams/:id/users/:userId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const teamId = normalizeParam(req.params?.id);
    const userId = normalizeParam(req.params?.userId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!teamId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isTeamOwner(actorId, teamId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeUserFromTeam(teamId, userId);
    if (!updated) return res.status(404).json({ error: 'Team not found' });
    return res.status(200).json({ team: updated });
});

router.post('/teams/:id/owners', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const teamId = normalizeParam(req.params?.id);
    const userId = normalizeParam(req.body?.userId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!teamId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isTeamOwner(actorId, teamId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await addOwnerToTeam(teamId, userId);
    if (!updated) return res.status(404).json({ error: 'Team or user not found' });
    return res.status(200).json({ team: updated });
});

router.delete('/teams/:id/owners/:userId', requireAuth, async (req: express.Request, res: express.Response) => {
    const actorId = req.user?.sub;
    const teamId = normalizeParam(req.params?.id);
    const userId = normalizeParam(req.params?.userId);
    if (!actorId) return res.status(401).json({ error: 'Unauthorized' });
    if (!teamId || !userId) return res.status(400).json({ error: 'Invalid request' });
    const actor = await getUserById(actorId);
    const isAdmin = hasPerms(actor?.permissions || 0, PERMISSIONS.ADMIN);
    if (!(await isTeamOwner(actorId, teamId)) && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = await removeOwnerFromTeam(teamId, userId);
    if (!updated) return res.status(404).json({ error: 'Team not found' });
    return res.status(200).json({ team: updated });
});

export default router;
