import * as path from 'path';
import { DataSource } from 'typeorm';
import { CONFIG } from '../config';

const entitiesGlob = path.resolve(__dirname, '../db/types/*.{js,ts}');

export const AppDataSource = new DataSource({
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

export function getDataSource(): DataSource {
    if (!AppDataSource.isInitialized) {
        throw new Error('DataSource not initialized. Call initDataSource() first.');
    }
    return AppDataSource;
}
