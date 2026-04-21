import express, {
    type ErrorRequestHandler,
    type Request,
    type RequestHandler,
    type Response,
    type Router,
} from 'express';
import compression from 'compression';
import cors from 'cors';

interface CreateAppOptions {
    apiRouter: Router;
    allowedOrigins?: string[];
}

export function createApp({ apiRouter, allowedOrigins = [] }: CreateAppOptions) {
    const app = express();

    app.use(cors({
        origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    }));
    app.use(compression());
    app.use(express.json());

    app.use('/api', apiRouter);

    app.use(((_req: Request, res: Response) => {
        res.status(404).json({ error: 'Not found' });
    }) as RequestHandler);

    app.use(((_err, _req, res, _next) => {
        res.status(500).json({ error: 'Internal server error' });
    }) as ErrorRequestHandler);

    return app;
}