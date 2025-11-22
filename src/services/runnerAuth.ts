import { CONFIG } from '../config';
import { createHmac, randomBytes } from 'crypto';

/**
 * Retrieve the configured runner shared secret.
 * Throws an Error when the secret is not configured.
 *
 * @returns {string} the runner shared secret
 * @throws {Error} when `CONFIG.RUNNER_SHARED_SECRET` is not set
 */
export function requireRunnerSecret(): string {
    if (!CONFIG.RUNNER_SHARED_SECRET) {
        throw new Error('RUNNER_SHARED_SECRET must be configured to use runners.');
    }
    return CONFIG.RUNNER_SHARED_SECRET;
}

/**
 * Generate a cryptographic nonce as a hex string.
 *
 * @param {number} [bytes=16] - Number of random bytes to generate
 * @returns {string} hex-encoded nonce
 */
export function generateNonce(bytes: number = 16): string {
    return randomBytes(bytes).toString('hex');
}

/**
 * Compute an HMAC-based token for a given nonce using the runner shared secret.
 *
 * @param {string} nonce - Nonce to compute the token for
 * @returns {string} hex-encoded HMAC token
 */
export function computeRunnerToken(nonce: string): string {
    const hmac = createHmac('sha256', requireRunnerSecret());
    hmac.update(nonce);
    return hmac.digest('hex');
}

/**
 * Verify a provided runner token against the expected token for a nonce.
 * Returns `true` when the token matches, `false` otherwise. Any errors during
 * token computation are treated as verification failures.
 *
 * @param {string} nonce - Nonce used to compute the expected token
 * @param {string|null|undefined} token - Token to verify
 * @returns {boolean} whether the token is valid
 */
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
