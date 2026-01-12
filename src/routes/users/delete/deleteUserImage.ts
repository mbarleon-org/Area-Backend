import * as express from 'express';
import { requireAuth, requireAdmin } from '../../../middleware/user';
import { getUserById, updateUserById } from '../../../services/userStore';

const router = express.Router();

const normalizeParam = (value: string | string[] | undefined): string | null => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
};

async function clearProfilePicture(targetId: string, res: express.Response) {
    try {
        const user = await getUserById(targetId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updated = await updateUserById(targetId, { profilePicture: null });
        if (!updated) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        return res.status(200).json({ message: 'Profile picture removed' });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

router.delete('/me/image', requireAuth, async (req: express.Request, res: express.Response) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return clearProfilePicture(userId, res);
});

router.delete('/:id/image', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const targetId = normalizeParam(req.params?.id);
    if (!targetId) {
        return res.status(400).json({ error: 'Missing ID' });
    }
    return clearProfilePicture(targetId, res);
});

export default router;
