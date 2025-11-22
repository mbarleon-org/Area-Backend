import * as path from 'path';
import { DataSource } from 'typeorm';
import { CONFIG } from '../config';

/**
 * Glob pattern pointing to entity files. Prefers compiled `.js` but includes `.ts` for dev.
 *
 * @type {string}
 */
const entitiesGlob: string = path.resolve(__dirname, '../db/types/*.{js,ts}');

/**
 * Application-wide TypeORM DataSource instance configured from environment `CONFIG`.
 * The instance is not immediately initialized; call `initDataSource()` to initialize.
 *
 * @type {DataSource}
 */
export const AppDataSource: DataSource = new DataSource({
    type: 'postgres',
    url: CONFIG.DATABASE_URL || undefined,
    host: CONFIG.DATABASE_URL ? undefined : CONFIG.DB_HOST,
    port: CONFIG.DATABASE_URL ? undefined : CONFIG.DB_PORT,
    username: CONFIG.DATABASE_URL ? undefined : CONFIG.DB_USER,
    password: CONFIG.DATABASE_URL ? undefined : CONFIG.DB_PASSWORD,
    database: CONFIG.DATABASE_URL ? undefined : CONFIG.DB_NAME,
    synchronize: true,
    logging: false,
    entities: [entitiesGlob]
});

let initializing: Promise<DataSource> | null = null;

/**
 * Initialize the global `AppDataSource` if it hasn't been initialized yet.
 * Multiple concurrent calls are coalesced to a single initialization promise.
 *
 * @returns {Promise<DataSource>} resolves with the initialized DataSource
 */
export async function initDataSource(): Promise<DataSource> {
    if (AppDataSource.isInitialized) {
        return AppDataSource;
    }
    if (initializing) {
        return initializing;
    }
    initializing = AppDataSource.initialize()
        .catch(err => {
            initializing = null;
            throw err;
        })
        .then(ds => {
            initializing = null;
            return ds;
        });
    return initializing;
}

/**
 * Return the initialized `AppDataSource` instance.
 *
 * @throws {Error} when the data source has not been initialized
 * @returns {DataSource} initialized DataSource instance
 */
export function getDataSource(): DataSource {
    if (!AppDataSource.isInitialized) {
        throw new Error('DataSource not initialized. Call initDataSource() first.');
    }
    return AppDataSource;
}
