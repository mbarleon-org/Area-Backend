import { Redis } from 'ioredis';
import { CONFIG } from '../config';

/**
 * Shared ioredis client instance used across the application.
 * It is configured with `lazyConnect: true` so callers must call `ensureRedis()` before use.
 *
 * @type {Redis}
 */
export const redis: Redis = new Redis(CONFIG.REDIS_URL, { lazyConnect: true });

/**
 * Return true when the redis client is not connected and should attempt a connect.
 *
 * @returns {boolean} `true` when redis status indicates disconnected
 */
function isRedisDisconnected(): boolean {
    return redis.status === 'wait' || redis.status === 'end';
}

/**
 * Ensure the Redis client is connected. If the client is in a disconnected state,
 * this will call `redis.connect()` and await completion. Safe to call multiple times.
 *
 * @returns {Promise<void>} resolves when the client is connected (or already connected)
 */
export async function ensureRedis(): Promise<void> {
    if (isRedisDisconnected()) {
        await redis.connect();
    }
}
