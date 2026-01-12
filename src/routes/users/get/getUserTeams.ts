import * as express from 'express';
import { getTeamsByUserID } from '../../../services/teamStore';
import { requireAdmin, requireAuth } from '../../../middleware/user';

const router = express.Router();

const normalizeParam = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
};

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

router.get('/:id/teams', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = normalizeParam(req.params?.id)
    if (!id) {
        return res.status(400).json({ error: "Missing ID" });
    }

    return getTeams(id, res);
});

export default router;
