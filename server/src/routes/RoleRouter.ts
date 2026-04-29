import { RoleHandler } from '@/handlers/RoleHandler';
import { asyncHandler } from '@/middleware/asyncHandler';
import { requireAuth } from '@/middleware/auth.middleware';
import { Router } from 'express';

export function createRoleRouter(handler: RoleHandler): Router {
    const router = Router();

    router.use(requireAuth);

    router.get('/', asyncHandler(handler.listRoles.bind(handler)));
    router.get('/:id', asyncHandler(handler.getRole.bind(handler)));

    return router;
}
