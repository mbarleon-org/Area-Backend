import * as express from 'express';
import { requireAuth, requireAdmin } from '../../../middleware/user';
import { getUserById, updateUserById } from '../../../services/userStore';

const router = express.Router();

async function saveProfilePicture(targetId: string, image: string, res: express.Response) {
    try {
        if (!image || typeof image !== 'string') {
            return res.status(400).json({ error: 'Invalid image payload' });
        }

        const payload = image.includes('base64,') ? image.split('base64,').pop() : image;
        let buffer: Buffer;
        try {
            buffer = Buffer.from(payload ?? '', 'base64');
        } catch (err) {
            return res.status(400).json({ error: 'Invalid image payload' });
        }

        const user = await getUserById(targetId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updated = await updateUserById(targetId, { profilePicture: buffer });
        if (!updated) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        return res.status(200).json({ message: 'Profile picture updated' });
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

router.put('/me/image', requireAuth, async (req: express.Request, res: express.Response) => {
    const userId = req.user?.sub;
    const image = req.body?.image;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return saveProfilePicture(userId, image, res);
});

router.put('/:id/image', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const targetId = req.params?.id;
    const image = req.body?.image;
    if (!targetId) {
        return res.status(400).json({ error: 'Missing ID' });
    }
    return saveProfilePicture(targetId, image, res);
});

export default router;
