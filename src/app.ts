import * as cors from 'cors';
import * as express from 'express';

/**
 * Create and configure the express application.
 *
 * @returns {express.Express} configured express app
 */
function createApp(): express.Express {
    const app = express();
    app.use(express.json());
    app.use(cors());
    return app;
}

export const APP = createApp();
