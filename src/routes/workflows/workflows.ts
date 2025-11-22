import * as express from 'express';
import { listWorkflows, loadWorkflow, saveWorkflow, setWorkflowEnabled } from '../../services/workflowStore.js';

const router = express.Router();

router.get('/workflows', async (_req, res) => {
    const items = await listWorkflows();
    return res.json({ workflows: items });
});

router.get('/workflows/:id', async (req, res) => {
    const wf = await loadWorkflow(req.params.id);
    if (!wf) return res.status(404).json({ error: 'not_found' });
    return res.json(wf);
});

router.post('/workflows', async (req, res) => {
    try {
        const saved = await saveWorkflow(req.body);
        return res.status(201).json(saved);
    } catch (err: any) {
        return res.status(400).json({ error: err?.message || 'invalid_workflow' });
    }
});

router.post('/workflows/:id/enable', async (req, res) => {
    const wf = await setWorkflowEnabled(req.params.id, true);
    if (!wf) return res.status(404).json({ error: 'not_found' });
    return res.json(wf);
});

router.post('/workflows/:id/disable', async (req, res) => {
    const wf = await setWorkflowEnabled(req.params.id, false);
    if (!wf) return res.status(404).json({ error: 'not_found' });
    return res.json(wf);
});

export default router;
