import 'reflect-metadata';
import 'dotenv/config';
import * as cors from 'cors';
import { CONFIG } from './config';
import * as express from 'express';
import routes from './routeList.js';
import { importLegacyFiles } from './legacy/importAll';
import { initDataSource } from './services/dataSource.js';
import { registerWorkflows } from './api/workflowRegistration.js';

/**
 * Validate the runtime configuration.
 *
 * @returns {void}
 * @throws {Error} if any config entry is `null` or `undefined`.
 */
function validateConfig(): void {
    Object.entries(CONFIG).forEach(([key, element]) => {
        if (element === null || element === undefined) {
            throw new Error(`Fatal Error: Config value not set (testing ${key}).`);
        }
    });
}

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

/**
 * Mount application routes under the configured `BASE_PATH`.
 *
 * @param {express.Express} app - the express application
 * @returns {void}
 */
function mountRoutes(app: express.Express): void {
    routes.forEach(route => {
        app.use(CONFIG.BASE_PATH, route);
    });
}

/**
 * Start the HTTP server.
 *
 * @param {express.Express} app - the express application
 * @returns {void}
 */
function startServer(app: express.Express): void {
    app.listen(CONFIG.LISTEN_ADDRESS, () => {
        console.log('Server is running on port', CONFIG.LISTEN_ADDRESS);
    });
}

/**
 * Bootstrap the application: init DB, import legacy files, register workflows
 * and start the HTTP server.
 *
 * @returns {Promise<void>} resolves when bootstrap completes or rejects on fatal error
 */
async function bootstrap(): Promise<void> {
    validateConfig();

    await initDataSource();

    await importLegacyFiles();

    const app = createApp();

    mountRoutes(app);

    try {
        await registerWorkflows(app, {});
        console.log('[startup] workflows registered');
    } catch (err) {
        console.error('[startup] failed to register workflows', err);
    }

    startServer(app);
}

bootstrap().catch(err => {
    console.error('Fatal startup error', err);
    process.exit(1);
});
