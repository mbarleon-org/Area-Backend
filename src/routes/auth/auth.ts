/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** auth.ts
*/

import * as express from 'express';
import * as authService from '../../services/auth';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: express.Request, res: express.Response) => {
    try {
        const { email, password, displayName } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const userId = await authService.register(email, password, displayName);
        res.status(201).json({ id: userId, email });
    } catch (err: any) {
        res.status(400).json({ error: err?.message ?? String(err) });
    }
});

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/login', async (req: express.Request, res: express.Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const result = await authService.login(email, password);
        res.json(result);
    } catch (err: any) {
        res.status(401).json({ error: err?.message ?? 'Invalid credentials' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info from JWT token
 */
router.get('/me', (req: express.Request, res: express.Response) => {
    try {
        const authHeader = req.headers.authorization?.split(' ')[1];
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const payload = authService.verifyToken(authHeader);
        res.json({ userId: payload.sub, permissions: payload.perms || [] });
    } catch (err: any) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
