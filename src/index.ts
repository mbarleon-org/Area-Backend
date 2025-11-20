import 'reflect-metadata';
import * as cors from 'cors';
import * as express from 'express';
import routes from './routeList.js';
import { CONFIG } from './config.js';

require('dotenv').config()

Object.values(CONFIG).forEach(element => {
    if (element === null) {
        throw new Error("Fatal Error: All elements in config are not set.");
    }
});

const app = express();

app.use(cors());

app.use(express.json());

routes.forEach(route => {
    app.use(CONFIG.BASE_PATH, route);
});

app.listen(CONFIG.LISTEN_ADDRESS, () => {
    console.log('Server is running on port', CONFIG.LISTEN_ADDRESS);
});
