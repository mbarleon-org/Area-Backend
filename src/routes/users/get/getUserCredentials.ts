import * as express from 'express';
import { requireAdmin, requireAuth } from '../../../middleware/user';
import { getCredentialsByUserId } from '../../../services/credentialStore';

const router = express.Router();

async function getCredentials(id: string, res: express.Response) {
    try {
        const results = await getCredentialsByUserId(id);

        if (!results || results.length === 0) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json(
            results.map(obj => ({
                id: obj.id,
                name: obj.name,
                type: obj.type,
                description: obj.description
            }))
        );
    } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
}

router.get('/:id/credentials', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = req.params?.id
    if (!id) {
        return res.status(400).json({ error: "Missing ID" });
    }

    return getCredentials(id, res);
});

export default router;
