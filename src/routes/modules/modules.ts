import * as express from 'express';
import { loadModuleCatalog } from '../../services/moduleCatalog';
import { requireAdmin, requireAuth } from '../../middleware/user';

const router = express.Router();

async function getReloadModulesHandler(_req: express.Request, res: express.Response): Promise<any> {
    loadModuleCatalog();
    return  res.status(201).json({ message: "Modules reloaded." });
}

/**
 * Handler for `GET /modules`.
 * Responds with the current module catalog.
 *
 * @param {express.Request} _req - Express request (unused)
 * @param {express.Response} res - Express response
 * @returns {express.Response} JSON response with `modules`
 */
async function getModulesHandler(_req: express.Request, res: express.Response): Promise<any> {
    const registry = await loadModuleCatalog();
    return res.json({ modules: registry.modules || {} });
}

router.get('/modules', getModulesHandler);
router.get('/modules/reload', requireAuth, requireAdmin, getReloadModulesHandler);

export default router;
