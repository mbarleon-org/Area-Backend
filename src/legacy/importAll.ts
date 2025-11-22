import { CONFIG } from '../config';
import { importLegacyWorkflows } from './importWorkflows'
import { importLegacyCredentials } from './importCredentials';

export async function importLegacyFiles() {
    if (CONFIG.LEGACY_WORKFLOWS_DIR) {
        await importLegacyWorkflows().catch(err => {
            console.error('[import-workflows] fatal', err);
        });
    }

    if (CONFIG.LEGACY_CREDENTIALS_DIR) {
        await importLegacyCredentials().catch(err => {
            console.error('[import-credentials] fatal', err);
        });
    }
}
