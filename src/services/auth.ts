/*
** EPITECH PROJECT, 2025
** G-DEV
** File description:
** auth.ts
*/

import * as crypto from './crypto';
import { CONFIG } from '../config';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';
import * as userStore from './userStore';

export interface TokenPayload {
    sub: string;
    iat: number;
    exp: number;
}

type PasswordContext = "reset" | "initialization";

export async function sendPasswordResetEmail(email: string, username: string, context: string = "reset"): Promise<any> {
    const token = jwt.sign(
        { email, username },
        CONFIG.JWT_SECRET as jwt.Secret,
        { expiresIn: "15m" } as jwt.SignOptions,
    )

    const transporter = nodemailer.createTransport({
        host: CONFIG.SMTP_HOST,
        port: CONFIG.SMTP_PORT,
        secure: CONFIG.SMTP_SSL,
        auth: {
            user: CONFIG.SMTP_USER,
            pass: CONFIG.SMTP_PASSWORD,
        }
    });

    const mailOptions: any = {
        from: CONFIG.SMTP_FROM,
        to: email,
        subject: `Area password ${context}`,
        text: `Your password ${context} link is ${CONFIG.FRONTEND_PUBLIC_URL}/password_reset?context=${context}&token=${token}\nDo not share this link. It will expire in 15 minutes.`
    };
    const info = await transporter.sendMail(mailOptions);
    return info;
}

export async function setPassword(password: string, decoded?: string | jwt.JwtPayload, context?: PasswordContext) {
    if (!decoded || typeof decoded !== "object") {
        return null;
    }

    const passwordHash = await crypto.hashPassword(password);
    let userId = null

    if (context && context === "initialization") {
        const existing = (await userStore.getUserByEmail(decoded.email)) || (await userStore.getUserByUsername(decoded.username));
        if (existing) {
            return null;
        }
        userId = await userStore.createUser({ email: decoded.email, passwordHash, username: decoded.username });
    } else {
        userId = await userStore.updatePassword(decoded.email, passwordHash);
    }
    return userId;
}

/**
 * Register a new user
 */
export async function register(email: string, username: string, password?: string): Promise<string> {
    const existingEmail = (await userStore.getUserByEmail(email));
    const existingUname = (await userStore.getUserByUsername(username));
    if (existingEmail) {
        throw new Error('User already exists (email)');
    }
    if (existingUname) {
        throw new Error('User already exists (username)');
    }

    if (CONFIG.CHECK_USER_EMAIL) {
        const info = await sendPasswordResetEmail(email, username, "initialization");

        return (info.accepted && info.accepted.length > 0) ? "OK" : "KO";
    }
    const passwordHash = await crypto.hashPassword(password!);
    const userId = await userStore.createUser({ email, passwordHash, username });
    return userId;
}

/**
 * Login user and return JWT token
 */
async function loginCore(user: any, password: string) {
    const storedHash: string = String(user.passwordHash ?? '');
    const passwordMatch = await crypto.verifyPassword(password, storedHash);
    if (!passwordMatch) {
        throw new Error('Invalid email or password');
    }

    const sub = String(user.id);
    const token = jwt.sign(
        { sub },
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
 * Login by email
 */
export async function loginByEmail(email: string, password: string) {
    const user = await userStore.getUserByEmail(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }
    return loginCore(user, password)
}

/**
 * Login by username
 */
export async function loginByUsername(username: string, password: string) {
    const user = await userStore.getUserByUsername(username);
    if (!user) {
        throw new Error('Invalid username or password');
    }
    return loginCore(user, password)
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, CONFIG.JWT_SECRET) as TokenPayload;
}
