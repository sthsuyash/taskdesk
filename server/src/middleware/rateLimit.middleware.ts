import { env } from '@/config/env';
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later', code: 'RATE_LIMIT_EXCEEDED' },
    keyGenerator: (req) => req.ip ?? 'unknown',
});

export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts, please try again in 15 minutes',
        code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    },
    keyGenerator: (req) => req.ip ?? 'unknown',
});
