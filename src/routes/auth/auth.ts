/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** auth.ts
*/

import * as express from 'express';
import * as authService from '../../services/auth';
import { requireAuth } from '../../middleware/user';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/auth/register', async (req: express.Request, res: express.Response) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password ||!username) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const userId = await authService.register(email, password, username);
        res.status(201).json({ id: userId, email, username });
    } catch (err: any) {
        res.status(400).json({ error: err?.message ?? String(err) });
    }
});

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/auth/login', async (req: express.Request, res: express.Response) => {
    try {
        const { username, email, password } = req.body;
        if ((!email && !username)|| !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        let result: any;
        if (email) {
            result = await authService.loginByEmail(email, password);
        } else {
            result = await authService.loginByUsername(email, password);
        }

        if (!result) {
            res.status(401).json({ error: 'Invalid credentials' });
        }

        res.status(200).json(result);
    } catch (err: any) {
        res.status(401).json({ error: err?.message ?? 'Invalid credentials' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info from JWT token
 */
router.get('/auth/me', requireAuth, async (req: express.Request, res: express.Response) => {
    try {
        res.status(200).json({ userId: req.user.sub, permissions: req.user.perms || [] });
    } catch (err: any) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
