import * as express from 'express';

const router = express.Router();

router.get("/healthz", async (_req, res) => {
    return res.status(200).json({status: "ok"});
});

export default router;
