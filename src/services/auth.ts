/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** auth.ts
*/

import * as jwt from 'jsonwebtoken';
import * as userStore from './userStore';
import * as crypto from './crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRY = '8h';

export interface TokenPayload {
    sub: string;
    perms?: string[];
    iat: number;
    exp: number;
}

/**
 * Helper to get a hashing function from src/services/crypto
 */
function getHashFunction(): ((p: string) => Promise<string>) | null {
    const c: any = crypto as any;
    // try common names, return an async wrapper when needed
    const fn = c.hashPassword ?? c.hash ?? c.hashSync ?? c.pbkdf2Hash ?? c.createHash;
    if (!fn) return null;
    return async (plain: string) => {
        const out = fn.call(c, plain);
        // if synchronous return value, wrap into Promise
        return out instanceof Promise ? out : Promise.resolve(out);
    };
}

/**
 * Helper to get a verify/compare function from src/services/crypto
 */
function getVerifyFunction(): ((plain: string, hashed: string) => Promise<boolean>) | null {
    const c: any = crypto as any;
    const fn = c.verifyPassword ?? c.verify ?? c.compare ?? c.compareHash;
    if (!fn) return null;
    return async (plain: string, hashed: string) => {
        const out = fn.call(c, plain, hashed);
        return out instanceof Promise ? out : Promise.resolve(Boolean(out));
    };
}

/**
 * Register a new user
 */
export async function register(email: string, password: string, displayName?: string): Promise<string> {
    const existing = await userStore.getUserByEmail(email);
    if (existing) {
        throw new Error('User already exists');
    }

    const hasher = getHashFunction();
    if (!hasher) {
        throw new Error('Crypto service: no hash function available. Check src/services/crypto.ts');
    }
    const passwordHash = await hasher(password);

    // createUser implementation expects a hashed password (field name handled inside userStore)
    const userId = await userStore.createUser({ email, passwordHash, displayName });
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

    const verifier = getVerifyFunction();
    if (!verifier) {
        throw new Error('Crypto service: no verify function available. Check src/services/crypto.ts');
    }

    // be robust to different DB field names: password / passwordHash / hash
    const storedHash: string = String((user as any).password ?? (user as any).passwordHash ?? (user as any).hash ?? '');
    const passwordMatch = await verifier(password, storedHash);
    if (!passwordMatch) {
        throw new Error('Invalid email or password');
    }

    const perms = await userStore.getPermissions(String((user as any).id));
    const sub = String((user as any).id);
    const token = jwt.sign({ sub, perms }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    return {
        token,
        user: {
            id: sub,
            email: (user as any).email ?? '',
            displayName: (user as any).displayName ?? (user as any).name ?? '',
        },
    };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
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