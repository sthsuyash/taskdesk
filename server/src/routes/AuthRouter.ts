import { AuthHandler } from '@/handlers/AuthHandler';
import { asyncHandler } from '@/middleware/asyncHandler';
import { requireAuth } from '@/middleware/auth.middleware';
import { loginRateLimiter } from '@/middleware/rateLimit.middleware';
import { Router } from 'express';

export function createAuthRouter(handler: AuthHandler): Router {
    const router = Router();

    router.post('/register', asyncHandler(handler.register.bind(handler)));
    router.post('/login', loginRateLimiter, asyncHandler(handler.login.bind(handler)));
    router.post('/logout', asyncHandler(handler.logout.bind(handler)));
    router.post('/refresh', asyncHandler(handler.refresh.bind(handler)));
    router.get('/me', requireAuth, asyncHandler(handler.me.bind(handler)));

    return router;
}
