import { CONFIG } from '../config';
import { importLegacyWorkflows } from './importWorkflows'
import { importLegacyCredentials } from './importCredentials';

/**
 * Import legacy workflows if the legacy workflows directory is configured.
 *
 * @returns {Promise<void>} resolves when import completes or errors are logged
 */
async function importWorkflowsIfEnabled(): Promise<void> {
    if (!CONFIG.LEGACY_WORKFLOWS_DIR) return;
    await importLegacyWorkflows().catch((err: any) => {
        console.error('[import-workflows] fatal', err);
    });
}

/**
 * Import legacy credentials if the legacy credentials directory is configured.
 *
 * @returns {Promise<void>} resolves when import completes or errors are logged
 */
async function importCredentialsIfEnabled(): Promise<void> {
    if (!CONFIG.LEGACY_CREDENTIALS_DIR) return;
    await importLegacyCredentials().catch((err: any) => {
        console.error('[import-credentials] fatal', err);
    });
}

/**
 * Entry point to import legacy files (workflows and credentials) when configured.
 * This function delegates to small helpers that preserve original behavior and error handling.
 *
 * @returns {Promise<void>} resolves when all conditional imports have been attempted
 */
export async function importLegacyFiles(): Promise<void> {
    await importWorkflowsIfEnabled();
    await importCredentialsIfEnabled();
}
