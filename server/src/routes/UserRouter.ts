import { UserHandler } from '@/handlers/UserHandler';
import { asyncHandler } from '@/middleware/asyncHandler';
import { requireAuth } from '@/middleware/auth.middleware';
import { Router } from 'express';

export function createUserRouter(handler: UserHandler): Router {
    const router = Router();

    router.use(requireAuth);

    router.get('/', asyncHandler(handler.listUsers.bind(handler)));
    router.post('/', asyncHandler(handler.createUser.bind(handler)));
    router.put('/:id', asyncHandler(handler.updateUser.bind(handler)));
    router.delete('/:id', asyncHandler(handler.deleteUser.bind(handler)));

    return router;
}
