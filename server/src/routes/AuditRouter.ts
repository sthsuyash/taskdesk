import { AuditHandler } from '@/handlers/AuditHandler';
import { asyncHandler } from '@/middleware/asyncHandler';
import { requireAuth } from '@/middleware/auth.middleware';
import { Router } from 'express';

export function createAuditRouter(handler: AuditHandler): Router {
    const router = Router();

    router.use(requireAuth);

    router.get('/', asyncHandler(handler.listAuditLogs.bind(handler)));
    router.get('/entity/:entityType/:entityId', asyncHandler(handler.listByEntity.bind(handler)));

    return router;
}
