import { Redis } from 'ioredis';
import { CONFIG } from '../config';

export const redis = new Redis(CONFIG.REDIS_URL, { lazyConnect: true });

export async function ensureRedis() {
    if (redis.status === 'wait' || redis.status === 'end') {
        await redis.connect();
    }
}
