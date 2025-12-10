import { UnauthorizedError } from '@/domain/errors/AppError';
import { getAuthTokenFromRequest } from '@/lib/auth-utils';
import { verifyAccessToken } from '@/lib/jwt-utils';
import { NextFunction, Request, Response } from 'express';

export function createAuthMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const token = getAuthTokenFromRequest(req);
        
        if (token) {
            try {
                const payload = verifyAccessToken(token);
                req.user = {
                    id: payload.sub,
                    email: payload.email,
                    roleId: payload.roleId,
                    createdAt: 0,
                    updatedAt: 0,
                };
            } catch {
                // Invalid token - continue without user
            }
        }
        next();
    };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return next(new UnauthorizedError());
    }
    next();
}

export function requireRole(roleIds: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roleIds.includes(req.user.roleId)) {
            return next(new UnauthorizedError('Insufficient permissions'));
        }
        next();
    };
}