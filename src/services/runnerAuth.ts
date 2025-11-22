import { CONFIG } from '../config';
import { createHmac, randomBytes } from 'crypto';

export function requireRunnerSecret(): string {
    if (!CONFIG.RUNNER_SHARED_SECRET) {
        throw new Error('RUNNER_SHARED_SECRET must be configured to use runners.');
    }
    return CONFIG.RUNNER_SHARED_SECRET;
}

export function generateNonce(bytes = 16): string {
    return randomBytes(bytes).toString('hex');
}

export function computeRunnerToken(nonce: string): string {
    const hmac = createHmac('sha256', requireRunnerSecret());
    hmac.update(nonce);
    return hmac.digest('hex');
}

export function verifyRunnerToken(nonce: string, token?: string | null): boolean {
    if (!token) {
        return false;
    }
    try {
        return computeRunnerToken(nonce) === token;
    } catch (err) {
        return false;
    }
}
