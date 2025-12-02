import * as express from 'express';
import { getTeamsByUserID } from '../../../services/teamStore';
import { requireAdmin, requireAuth } from '../../../middleware/user';

const router = express.Router();

async function getCredentials(id: string, res: express.Response) {
    try {
        const results = await getTeamsByUserID(id);

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

router.get('/me/credentials', requireAuth, async (req: express.Request, res: express.Response) => {
    return getCredentials(req.user.sub, res);
});

router.get('/:id/credentials', requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = req.params?.id
    if (!id) {
        return res.status(400).json({ error: "Missing ID" });
    }

    return getCredentials(id, res);
});

export default router;
