import * as express from 'express';
import { hasPerms, PERMISSIONS } from '../../../services/permissions';
import { requireAdmin, requireAuth } from '../../../middleware/user';
import { getUserById, getUserByEmail, getUserByUsername } from '../../../services/userStore';

const router = express.Router();

const normalizeParam = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
};

async function getUser(id: string, res: express.Response) {
    try {
        const user = await getUserById(id);

        if (!user) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({
            id: user.id,
            email: user.email,
            username: user.username,
            isAdmin: hasPerms(user.permissions, PERMISSIONS.ADMIN),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

router.get('/me', requireAuth, async (req: express.Request, res: express.Response) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return getUser(userId, res);
});

router.get('/email/:email', requireAuth, async (req: express.Request, res: express.Response) => {
    try {
        const email = normalizeParam(req.params?.email);

        if (!email) {
            return res.status(400).json({ error: "Missing email" });
        }
        const user = await getUserByEmail(email);
        if (user === null) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({ id: user.id, username: user.username, email: user.email });
    } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/username/:username', requireAuth, async (req: express.Request, res: express.Response) => {
    try {
        const username = normalizeParam(req.params?.username);

        if (!username) {
            return res.status(400).json({ error: "Missing username" });
        }
        const user = await getUserByUsername(username);
        if (user === null) {
            return res.status(404).json({ error: "Not found" });
        }
        return res.status(200).json({ id: user.id, username: user.username, email: user.email });
    } catch (err: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/:id', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = normalizeParam(req.params?.id)
    if (!id) {
        return res.status(400).json({ error: "Missing ID" });
    }

    return getUser(id, res);
});

export default router
