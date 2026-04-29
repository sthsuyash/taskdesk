import { Container } from '@/container';
import { Request, Response, Router } from 'express';
import { createAuditRouter } from './AuditRouter';
import { createAuthRouter } from './AuthRouter';
import { createRoleRouter } from './RoleRouter';
import { createSessionRouter } from './SessionRouter';
import { createTaskRouter } from './TaskRouter';
import { createUserRouter } from './UserRouter';

export function createApiRouter(container: Container): Router {
    const router = Router();

    router.get('/', (_req: Request, res: Response) => {
        res.json({ message: 'Welcome to Taskdesk API', version: '1.0.0', docs: '/api-docs' });
    });

    router.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    });

    router.use('/auth', createAuthRouter(container.authHandler));
    router.use('/tasks', createTaskRouter(container.taskHandler));
    router.use('/users', createUserRouter(container.userHandler));
    router.use('/sessions', createSessionRouter(container.sessionHandler));
    router.use('/roles', createRoleRouter(container.roleHandler));
    router.use('/audit', createAuditRouter(container.auditHandler));

    return router;
}
