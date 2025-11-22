import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { readJsoncFile } from './readFile';
import { encryptObject } from '../services/crypto.js';
import { getDataSource } from '../services/dataSource';
import { Credential as CredentialEntity } from '../db/types/credential';

/**
 * Ensure the configured legacy credentials directory exists.
 * If it does not exist the process will exit with an error.
 *
 * @param {string} dir - Path to the legacy credentials directory
 * @returns {void}
 */
function ensureCredentialsDirExists(dir: string): void {
    if (!fs.existsSync(dir)) {
        console.error(`[import-credentials] credential directory not found: ${dir}`);
        process.exit(1);
    }
}

/**
 * List candidate credential files in a directory.
 *
 * @param {string} dir - Directory to read
 * @returns {string[]} array of file names ending with .json or .jsonc
 */
function listCredentialFiles(dir: string): string[] {
    return fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.jsonc'));
}

/**
 * Read a credential file and persist it using the repository.
 * Errors are logged but do not stop the import loop.
 *
 * @param {string} filePath - Absolute path to credential file
 * @param {any} repo - TypeORM repository for the Credential entity
 * @returns {Promise<void>} resolves when the file is processed
 */
async function processCredentialFile(filePath: string, repo: any): Promise<void> {
    const fileName = path.basename(filePath);
    try {
        const cred = await readJsoncFile(filePath);
        if (!cred) {
            console.warn(`[import-credentials] skipped (no id): ${fileName}`);
            return;
        }
        const entity = repo.create({
            id: cred.id,
            name: cred.pretty_name || cred.id,
            version: cred.version || '1.0.0',
            type: cred.type,
            description: cred.description || null,
            credential: encryptObject(cred.credential || {}),
            owners: cred.owners || [],
            ownerTeams: cred.ownerTeams || [],
            users: cred.users || [],
            userTeams: cred.userTeams || []
        });
        await repo.save(entity);
        console.log(`[import-credentials] imported ${cred.name}`);
    } catch (err: any) {
        console.error(`[import-credentials] failed ${fileName}:`, err?.message || err);
    }
}

/**
 * Import legacy credentials from the configured directory.
 *
 * @returns {Promise<void>} resolves when import completes
 */
export async function importLegacyCredentials(): Promise<void> {
    const repo = getDataSource().getRepository(CredentialEntity);
    const dir = CONFIG.LEGACY_CREDENTIALS_DIR as string;

    ensureCredentialsDirExists(dir);

    const files = listCredentialFiles(dir);
    if (files.length === 0) {
        console.log('[import-credentials] no credential files found');
        return;
    }

    for (const file of files) {
        const fp = path.join(dir, file);
        await processCredentialFile(fp, repo);
    }
}
