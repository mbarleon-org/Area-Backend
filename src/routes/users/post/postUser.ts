import * as express from 'express';
import { requireAuth, requireAdmin } from '../../../middleware/user';
import * as authService from '../../../services/auth';
import { CONFIG } from '../../../config';

const router = express.Router();

router.post('/', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
        const { email, password, username } = req.body ?? {};

        if (!email || (!password && !CONFIG.CHECK_USER_EMAIL) || !username) {
            return res.status(400).json({ error: 'Email, username and password are required' });
        }

        const userId = await authService.register(email, username, password);

        if (CONFIG.CHECK_USER_EMAIL) {
            return userId === 'OK'
                ? res.status(200).json({ message: 'Email sent' })
                : res.status(500).json({ error: 'Internal Server Error' });
        }
        return res.status(201).json({ id: userId, email, username });
    } catch (err: any) {
        if (err?.message &&
            ((err.message as string).endsWith('(email)') ||
                (err.message as string).endsWith('(username)'))) {
            return res.status(409).json({ message: err.message });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
