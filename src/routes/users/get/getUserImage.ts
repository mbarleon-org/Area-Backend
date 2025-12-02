import * as express from 'express';
import { requireAdmin, requireAuth } from '../../../middleware/user';
import { getUserById, getUserByUsername, getUserByEmail } from '../../../services/userStore';

const router = express.Router();

async function getUserImage(id: string, res: express.Response) {
    try {
        const user = await getUserById(id);

        if (user?.image === null) {
            return res.status(404).json({ error: "Not found" });
        }
        res.set('Content-Type', 'image/png');
        return res.status(200).send(user.image);
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

router.get('/me/image', requireAuth, async (req: express.Request, res: express.Response) => {
    return getUserImage(req.user.sub, res);
});

router.get('/:id/image', requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = req.params?.id

    if (!id) {
        return res.status(400).json({ error: "Missing ID" });
    }
    return getUserImage(id, res);
});

router.get('/email/:email/image', requireAuth, async (req: express.Request, res: express.Response) => {
    try {
        const email = req.params?.email;

        if (email === null) {
            return res.status(400).json({ error: "Missing email" });
        }
        const user = await getUserByEmail(email);
        if (user === null) {
            return res.status(404).json({ error: "Not found" });
        }
        return getUserImage(user.id, res);
    } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/username/:username/image', requireAuth, async (req: express.Request, res: express.Response) => {
    try {
        const username = req.params?.username;

        if (username === null) {
            return res.status(400).json({ error: "Missing username" });
        }
        const user = await getUserByUsername(username);
        if (user === null) {
            return res.status(404).json({ error: "Not found" });
        }
        return getUserImage(user.id, res);
    } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
