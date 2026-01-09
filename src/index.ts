import 'dotenv/config';
import 'reflect-metadata';
import { App } from './app';
import { CONFIG } from './config';
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
 * Mount application routes under the configured `BASE_PATH`.
 *
 * @param {express.Express} app - the express application
 * @returns {void}
 */
function mountRoutes(): void {
    routes.forEach(route => {
        App.getInstance<App>().use(CONFIG.BASE_PATH, route);
    });
}

/**
 * Start the HTTP server.
 *
 * @param {express.Express} app - the express application
 * @returns {void}
 */
function startServer(): void {
    App.getInstance<App>().use((_req, res, _next) => {
        res.status(404).json({ message: 'Not found' });
    });

    App.getInstance<App>().listen(CONFIG.LISTEN_ADDRESS, () => {
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

    mountRoutes();

    try {
        await registerWorkflows({});
        console.log('[startup] workflows registered');
    } catch (err) {
        console.error('[startup] failed to register workflows', err);
    }

    startServer();
}

bootstrap().catch(err => {
    console.error('Fatal startup error', err);
    process.exit(1);
});
