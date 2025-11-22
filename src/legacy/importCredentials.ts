import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { readJsoncFile } from './readFile';
import { getDataSource } from '../services/dataSource';
import { Credential as CredentialEntity } from '../db/types/credential';

export async function importLegacyCredentials() {
    const repo = getDataSource().getRepository(CredentialEntity);

    if (!fs.existsSync(CONFIG.LEGACY_CREDENTIALS_DIR)) {
        console.error(`[import-credentials] credential directory not found: ${CONFIG.LEGACY_CREDENTIALS_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(CONFIG.LEGACY_CREDENTIALS_DIR).filter(f => f.endsWith('.json') || f.endsWith('.jsonc'));
    if (files.length === 0) {
        console.log('[import-credentials] no credential files found');
        return;
    }

    for (const file of files) {
        const fp = path.join(CONFIG.LEGACY_CREDENTIALS_DIR, file);
        try {
            const cred = await readJsoncFile(fp);
            if (!cred) {
                console.warn(`[import-credentials] skipped (no id): ${file}`);
                continue;
            }
            const entity = repo.create({
                id: cred.id,
                name: cred.pretty_name || cred.id,
                version: cred.version || '1.0.0',
                type: cred.type,
                description: cred.description || null,
                credential: cred.credential || {},
                owners: cred.owners || [],
                ownerTeams: cred.ownerTeams || [],
                users: cred.users || [],
                userTeams: cred.userTeams || []
            });
            await repo.save(entity);
            console.log(`[import-credentials] imported ${cred.name}`);
        } catch (err: any) {
            console.error(`[import-credentials] failed ${file}:`, err?.message || err);
        }
    }
}
