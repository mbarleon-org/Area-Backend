import * as cors from 'cors';
import * as express from 'express';
import { Singleton } from './singleton';

/**
 * Create and configure the express application.
 *
 * @returns {express.Express} Configured express app instance.
 */
function createApp(): express.Express {
    const app = express();
    app.use(express.json());
    app.use(cors());
    return app;
}

/**
 * Singleton-wrapped Express app with typed `use` overloads and helpers.
 */
export class App extends Singleton {

    /**
     * Protected constructor to prevent direct instantiation.
     */
    protected constructor() {
        super();
    }

    /**
     * Underlying Express application instance.
     */
    private app: express.Express = createApp();

    /**
     * Register middleware or router at a specific path or as global handlers.
     *
     * @param {string | express.RequestHandler} pathOrHandler Path to mount on or the first handler when no path is provided.
     * @param {...express.RequestHandler} handlers Additional handlers executed in order.
     * @returns {void}
     */
    public use(path: string, ...handlers: express.RequestHandler[]): void;

    public use(...handlers: express.RequestHandler[]): void;

    public use(
        pathOrHandler: string | express.RequestHandler,
        ...handlers: express.RequestHandler[]
    ): void {
        if (typeof pathOrHandler === 'string') {
            this.app.use(pathOrHandler, ...handlers);
        } else {
            this.app.use(pathOrHandler, ...handlers);
        }
    }

    /**
     * Start listening on the provided port.
     *
     * @param {number} port Port to bind the HTTP server on.
     * @param {() => void} [callback] Optional callback once the server is ready.
     * @returns {void}
     */
    public listen(port: number, callback?: () => void): void {
        this.app.listen(port, callback);
    }

    /**
     * Access the underlying Express router for advanced routing operations.
     *
     * @returns {express.Router} Express router instance currently in use.
     */
    public getRouter(): express.Router {
        return this.app._router;
    }
}
