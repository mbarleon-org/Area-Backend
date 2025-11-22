import { Workflow } from './types';

export function validateWorkflow(wf: Workflow) {
    if (!wf.id) {
        throw new Error('workflow missing id');
    }
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
    return wf.id;
}
