import * as express from 'express';
import { listUsers } from '../../../services/userStore';
import { requireAdmin, requireAuth } from '../../../middleware/user';
import { hasPerms, PERMISSIONS } from '../../../services/permissions';

const router = express.Router();

router.get('/all', requireAuth, requireAdmin, async (_req: express.Request, res: express.Response) => {
    try {
        const users = await listUsers();
        if (!users || users.length === 0) {
            return res.status(404).json({ error: 'Not found' });
        }
        return res.status(200).json(users.map(u => ({
            id: u.id,
            email: u.email,
            username: u.username,
            isAdmin: hasPerms(u.permissions, PERMISSIONS.ADMIN),
            createdAt: u.createdAt,
            updatedAt: u.updatedAt
        })));
    } catch (err: any) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
