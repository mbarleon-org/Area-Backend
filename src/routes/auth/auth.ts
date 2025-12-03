/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** auth.ts
*/

import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import { CONFIG } from '../../config';
import * as authService from '../../services/auth';
import { getUserById } from '../../services/userStore';
import { requireAuth, requireAdmin } from '../../middleware/user';

const router = express.Router();

async function resetPassword(id: string, res: express.Response) {
    try {
        if (!CONFIG.CHECK_USER_EMAIL) {
            return res.status(404).json({ message: "Not found" });
        }

        const user = await getUserById(id)

        if (user === null) {
            return res.status(404).json({ error: "Not found" });
        }
        const info = await authService.sendPasswordResetEmail(user.email, user.username);
        return info === "OK" ?
            res.status(200).json({ message: "Email sent" }) :
            res.status(500).json({ error: "Internal Server Error" });
    } catch (err: any) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

router.get('/auth/reset_password', async (req: express.Request, res: express.Response) => {
    return resetPassword(req.user.sub, res)
})

router.get('/auth/:id/reset_password', requireAuth, requireAdmin, async (req: express.Request, res: express.Response) => {
    const id = req.params?.id
    if (!id) {
        return res.status(400).json({ error: "Missing ID" });
    }

    return resetPassword(id, res);
})


router.post('/auth/set_password', async (req: express.Request, res: express.Response) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Malformed token' });
        }
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);

        const { password, context } = req.body;
        if (!password) {
            return res.status(400).json({ error: "Missing password" });
        }

        const userId = await authService.setPassword(password, decoded, context);

        if (!userId) {
            return res.status(context && context === "initialization" ? 409 : 500).json({ error: "Could not set the password" });
        }

        return res.status(context && context === "initialization" ? 201 : 200).json({ userId: userId });
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired" });
        }
        if (err.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token" });
        }
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/auth/register', async (req: express.Request, res: express.Response) => {
    try {
        const { email, password, username } = req.body;
        if (!email || (!password && !CONFIG.CHECK_USER_EMAIL) || !username) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const userId = await authService.register(email, username, password);
        if (CONFIG.CHECK_USER_EMAIL) {
            return userId === "OK" ?
                res.status(200).json({ message: "Email sent" }) :
                res.status(500).json({ error: "Internal Server Error" });

        }
        return res.status(201).json({ id: userId, email, username });
    } catch (err: any) {
        if (err.message &&
            ((err.message as string).endsWith("(email)") ||
            (err.message as string).endsWith("(username)"))) {
            return res.status(409).json({ message: err.message });
        }
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/auth/login', async (req: express.Request, res: express.Response) => {
    try {
        const { username, email, password } = req.body;
        if ((!email && !username) || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        let result: any;
        if (email) {
            result = await authService.loginByEmail(email, password);
        } else {
            result = await authService.loginByUsername(email, password);
        }

        if (!result) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        return res.status(200).json(result);
    } catch (err: any) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/auth/supports_check_email', async (_req: express.Request, res: express.Response) => {
    try {
        if (CONFIG.CHECK_USER_EMAIL) {
            return res.status(200).json({ message: "ok" });
        }
        return res.status(404).json({ message: "Not found" });
    } catch (err: any) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
