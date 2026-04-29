import { SessionHandler } from '@/handlers/SessionHandler';
import { asyncHandler } from '@/middleware/asyncHandler';
import { requireAuth } from '@/middleware/auth.middleware';
import { Router } from 'express';

export function createSessionRouter(handler: SessionHandler): Router {
    const router = Router();

    router.use(requireAuth);

    router.get('/', asyncHandler(handler.listSessions.bind(handler)));
    router.post('/', asyncHandler(handler.createSession.bind(handler)));
    router.get('/:id', asyncHandler(handler.getSession.bind(handler)));
    router.post('/:id/events', asyncHandler(handler.addEvents.bind(handler)));
    router.delete('/:id', asyncHandler(handler.deleteSession.bind(handler)));

    return router;
}
