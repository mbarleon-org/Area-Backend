import * as crypto from 'crypto';
import { CONFIG } from '../config';

const IV_LENGTH = 12;
const ALGO = 'aes-256-gcm';

type EncryptedWrapper = { __encrypted: true; data: string };

/**
 * Parse a hex string into a 32-byte Buffer key.
 * @param {string|undefined} hex - hex string representation of the key
 * @returns {Buffer|null} 32-byte key buffer or null when invalid
 */
function parseHexKey(hex?: string): Buffer | null {
    if (!hex) return null;
    try {
        const buf = Buffer.from(hex, 'hex');
        if (buf.length !== 32) return null;
        return buf;
    } catch (e) {
        return null;
    }
}

/**
 * Retrieve the configured encryption key from `CONFIG`.
 * @returns {Buffer|null} key buffer or null when not configured/invalid
 */
function getKey(): Buffer | null {
    return parseHexKey(CONFIG.AREA_ENCRYPTION_KEY as string | undefined);
}

/**
 * Check whether encryption is available (valid key configured).
 * @returns {boolean} true when a valid key is configured
 */
export function encryptionEnabled(): boolean {
    return getKey() !== null;
}

/**
 * Serialize a JS value into a UTF-8 Buffer.
 * @param {unknown} obj - value to serialize
 * @returns {Buffer} UTF-8 buffer of the JSON representation
 */
function serializePlaintext(obj: unknown): Buffer {
    return Buffer.from(JSON.stringify(obj), 'utf8');
}

/**
 * Build a single Buffer payload from IV, auth tag and ciphertext and return base64.
 * @param {Buffer} iv - initialization vector
 * @param {Buffer} tag - authentication tag
 * @param {Buffer} ciphertext - encrypted payload
 * @returns {string} base64 encoded combined payload
 */
function buildPayload(iv: Buffer, tag: Buffer, ciphertext: Buffer): string {
    const out = Buffer.concat([iv, tag, ciphertext]);
    return out.toString('base64');
}

/**
 * Split a combined payload buffer into iv, tag and ciphertext.
 * @param {Buffer} buf - combined payload buffer
 * @returns {{iv: Buffer, tag: Buffer, ciphertext: Buffer}}
 */
function splitPayload(buf: Buffer): { iv: Buffer; tag: Buffer; ciphertext: Buffer } {
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = buf.subarray(IV_LENGTH + 16);
    return { iv, tag, ciphertext };
}

/**
 * Encrypt an object when a key is configured. If no key is present the original
 * object is returned unchanged.
 *
 * @param {unknown} obj - object/value to encrypt
 * @returns {unknown|EncryptedWrapper} encrypted wrapper when key exists, otherwise the original value
 */
export function encryptObject(obj: unknown): unknown {
    const key = getKey();
    if (!key) {
        return obj;
    }
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: 16 });
    const plaintext = serializePlaintext(obj);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { __encrypted: true, data: buildPayload(iv, tag, ciphertext) } as EncryptedWrapper;
}

/**
 * Decrypt a stored value previously created by `encryptObject`.
 * If no key is configured or the stored value is not in the expected shape the
 * original value is returned unchanged.
 *
 * @param {unknown} stored - value read from storage
 * @returns {unknown} decrypted object on success or original `stored` on failure
 */
export function decryptObject(stored: unknown): unknown {
    const key = getKey();
    if (!key) return stored;

    if (!stored || typeof stored !== 'object') return stored;
    const maybe = stored as Record<string, unknown>;
    if (maybe.__encrypted !== true || typeof maybe.data !== 'string') return stored;

    try {
        const buf = Buffer.from(String(maybe.data), 'base64');
        const { iv, tag, ciphertext } = splitPayload(buf);
        const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: 16 });
        decipher.setAuthTag(tag);
        const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        return JSON.parse(plain.toString('utf8'));
    } catch (e) {
        return stored;
    }
}
