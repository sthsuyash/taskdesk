import { swaggerSpec } from '@/config/swagger';
import { Container } from '@/container';
import { createAuthMiddleware } from '@/middleware/auth.middleware';
import { errorMiddleware } from '@/middleware/error.middleware';
import compression from 'compression';
import cors from 'cors';
import express, { Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';

interface AppOptions {
    container: Container;
    apiRouter: Router;
    allowedOrigins?: string[];
}

export function createApp({ container, apiRouter, allowedOrigins = [] }: AppOptions) {
    const app = express();

    app.use(
        cors({
            origin: allowedOrigins.length > 0 ? allowedOrigins : true,
            credentials: true,
        })
    );
    app.use(compression());
    app.use(express.json());

    app.use(createAuthMiddleware(container.authService));

    app.use('/api', apiRouter);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api-docs.json', (_req: Request, res: Response) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    app.get('/api/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    });

    app.use((_req: Request, res: Response) => {
        res.status(404).json({ error: 'Not found' });
    });

    app.use(errorMiddleware);

    return app;
}
