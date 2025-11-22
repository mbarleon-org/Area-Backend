import { Workflow } from './types';

/**
 * Ensure the workflow has a valid `id`.
 *
 * @param {Workflow} wf - workflow to validate
 * @throws {Error} when `id` is missing or falsy
 */
function ensureHasId(wf: Workflow) {
    if (!wf.id) {
        throw new Error('workflow missing id');
    }
}

/**
 * Validate that triggers exist and that each trigger has a unique, valid name.
 *
 * @param {Workflow} wf - workflow to validate
 * @throws {Error} when triggers array is missing or invalid
 */
function validateTriggers(wf: Workflow) {
    if (!Array.isArray(wf.triggers)) {
        throw new Error(`workflow ${wf.id} missing triggers array`);
    }
    const names = new Set<string>();
    for (const t of wf.triggers || []) {
        if (!t.name || typeof t.name !== 'string') {
            throw new Error(`workflow ${wf.id} trigger missing name`);
        }
        if (names.has(t.name)) {
            throw new Error(`workflow ${wf.id} duplicate trigger name ${t.name}`);
        }
        names.add(t.name);
    }
}

/**
 * Validate that actions exist and each action has a unique, valid name.
 *
 * @param {Workflow} wf - workflow to validate
 * @throws {Error} when actions array is missing or invalid
 */
function validateActions(wf: Workflow) {
    if (!Array.isArray(wf.actions) || wf.actions.length === 0) {
        throw new Error(`workflow ${wf.id} missing actions`);
    }
    const nodeNames = new Set<string>();
    for (const a of wf.actions || []) {
        if (!a.name || typeof a.name !== 'string') {
            throw new Error(`workflow ${wf.id} action missing name`);
        }
        if (nodeNames.has(a.name)) {
            throw new Error(`workflow ${wf.id} duplicate action name ${a.name}`);
        }
        nodeNames.add(a.name);
    }
}

/**
 * Validate a workflow structure for required fields and uniqueness constraints.
 * This function delegates to smaller validators to keep checks focused and testable.
 *
 * @param {Workflow} wf - workflow to validate
 * @returns {string} the validated workflow id
 * @throws {Error} when validation fails
 */
export function validateWorkflow(wf: Workflow): string {
    ensureHasId(wf);
    validateTriggers(wf);
    validateActions(wf);
    return wf.id;
}
