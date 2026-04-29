import { TaskHandler } from '@/handlers/TaskHandler';
import { asyncHandler } from '@/middleware/asyncHandler';
import { requireAuth } from '@/middleware/auth.middleware';
import { Router } from 'express';

export function createTaskRouter(handler: TaskHandler): Router {
    const router = Router();

    router.use(requireAuth);

    router.get('/', asyncHandler(handler.listTasks.bind(handler)));
    router.post('/', asyncHandler(handler.createTask.bind(handler)));
    router.put('/:id', asyncHandler(handler.updateTask.bind(handler)));
    router.delete('/:id', asyncHandler(handler.deleteTask.bind(handler)));

    return router;
}
