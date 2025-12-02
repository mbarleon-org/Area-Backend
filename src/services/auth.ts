/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** auth.ts
*/

import * as jwt from 'jsonwebtoken';
import * as userStore from './userStore';
import * as crypto from './crypto';
import { CONFIG } from '../config';

export interface TokenPayload {
    sub: string;
    perms?: string[];
    iat: number;
    exp: number;
}

/**
 * Register a new user
 */
export async function register(email: string, password: string, username: string): Promise<string> {
    const existing = await userStore.getUserByEmail(email);
    if (existing) {
        throw new Error('User already exists');
    }

    const passwordHash = await crypto.hashPassword(password);
    const userId = await userStore.createUser({ email, passwordHash, username });
    return userId;
}

/**
 * Login user and return JWT token
 */
export async function login(email: string, password: string) {
    const user = await userStore.getUserByEmail(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }

    const storedHash: string = String(user.password ?? '');
    const passwordMatch = await crypto.verifyPassword(password, storedHash);
    if (!passwordMatch) {
        throw new Error('Invalid email or password');
    }

    const perms = await userStore.getPermissions(String(user.id));
    const sub = String(user.id);
    const token = jwt.sign(
        { sub, perms },
        CONFIG.JWT_SECRET as jwt.Secret,
        { expiresIn: CONFIG.JWT_EXPIRY } as jwt.SignOptions,
    );
    return {
        token,
        user: {
            id: sub,
            email: user.email,
            displayName: user.username,
        },
    };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, CONFIG.JWT_SECRET) as TokenPayload;
}

/**
 * Express middleware to check if user has required permission
 */
export function requirePermission(permission: string) {
    return (req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization?.split(' ')[1];
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }
        try {
            const payload = verifyToken(authHeader);
            if (!payload.perms || !payload.perms.includes(permission)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            req.userId = payload.sub;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
}
