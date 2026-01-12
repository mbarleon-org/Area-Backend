import * as express from 'express';
import { requireAuth, requireAdmin } from '../../../middleware/user';
import { deleteUserById } from '../../../services/userStore';

const router = express.Router();

const normalizeParam = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
};

async function removeUser(userId: string, res: express.Response) {
    try {
        const deleted = await deleteUserById(userId);
        if (!deleted) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ message: 'User deleted' });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

router.delete('/me', requireAuth, async (req: express.Request, res: express.Response) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return removeUser(userId, res);
});

router.delete('/:id', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = normalizeParam(req.params?.id);
    if (!id) {
        return res.status(400).json({ error: 'Missing ID' });
    }
    return removeUser(id, res);
});

export default router;
