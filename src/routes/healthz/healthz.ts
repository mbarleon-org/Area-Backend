import * as express from 'express';

const router = express.Router();

/**
 * Health check handler.
 *
 * @param {express.Request} _req - Express request object (unused)
 * @param {express.Response} res - Express response object
 * @returns {Promise<express.Response>} HTTP 200 JSON `{ status: 'ok' }`
 */
async function healthzHandler(_req: express.Request, res: express.Response): Promise<express.Response> {
    return res.status(200).json({ status: 'ok' });
}

router.get('/healthz', healthzHandler);

export default router;
