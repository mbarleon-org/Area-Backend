import { CONFIG } from '../config';
import * as jwt from 'jsonwebtoken';
import { getUserById } from '../services/userStore';
import { hasPerms, PERMISSIONS } from '../services/permissions';
import { Request, Response, NextFunction } from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Malformed token' });
    }
    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired" });
        }
        if (err.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token" });
        }
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        if (!hasPerms((await getUserById(req.user.sub))?.permissions || 0, PERMISSIONS.ADMIN)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    } catch (err) {
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
