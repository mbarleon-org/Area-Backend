import * as express from 'express';
import { loadModuleCatalog } from '../../services/moduleCatalog';
import { requireAdmin, requireAuth } from '../../middleware/user';

const router = express.Router();

async function getReloadModulesHandler(_req: express.Request, res: express.Response): Promise<any> {
    loadModuleCatalog();
    return  res.status(200).json({ message: "Modules reloaded." });
}

router.get('/modules/reload', requireAuth, requireAdmin, getReloadModulesHandler);

export default router;
