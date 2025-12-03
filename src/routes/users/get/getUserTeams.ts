import * as express from 'express';
import { getTeamsByUserID } from '../../../services/teamStore';
import { requireAdmin, requireAuth } from '../../../middleware/user';

const router = express.Router();

async function getTeams(id: string, res: express.Response) {
    try {
        const results = await getTeamsByUserID(id);

        if (!results || results.length === 0) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json(
            results.map(obj => ({
                id: obj.id,
                name: obj.name
            }))
        );
    } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

router.get('/me/teams', requireAuth, async (req: express.Request, res: express.Response) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return getTeams(userId, res);
});

router.get('/:id/teams', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = req.params?.id
    if (!id) {
        return res.status(400).json({ error: "Missing ID" });
    }

    return getTeams(id, res);
});

export default router;
