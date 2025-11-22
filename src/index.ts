import 'reflect-metadata';
import 'dotenv/config';
import * as cors from 'cors';
import { CONFIG } from './config';
import * as express from 'express';
import routes from './routeList.js';
import { importLegacyFiles } from './legacy/importAll';
import { initDataSource } from './services/dataSource.js';
import { registerWorkflows } from './api/workflowRegistration.js';

Object.values(CONFIG).forEach(element => {
    if (element === null) {
        throw new Error("Fatal Error: All elements in config are not set.");
    }
});

async function bootstrap() {
    await initDataSource();

    await importLegacyFiles();

    const app = express();

    app.use(express.json());

    app.use(cors());

    routes.forEach(route => {
        app.use(CONFIG.BASE_PATH, route);
    });

    try {
        await registerWorkflows(app, {});
        console.log('[startup] workflows registered');
    } catch (err) {
        console.error('[startup] failed to register workflows', err);
    }

    app.listen(CONFIG.LISTEN_ADDRESS, () => {
        console.log('Server is running on port', CONFIG.LISTEN_ADDRESS);
    });
}

bootstrap().catch(err => {
    console.error('Fatal startup error', err);
    process.exit(1);
});
