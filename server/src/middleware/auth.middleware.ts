import { UnauthorizedError } from '@/domain/errors/AppError';
import { getAuthTokenFromRequest } from '@/lib/auth-utils';
import { AuthService } from '@/services/AuthService';
import { NextFunction, Request, Response } from 'express';

export function createAuthMiddleware(authService: AuthService) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const token = getAuthTokenFromRequest(req);
        if (token) {
            const user = await authService.getSession(token);
            if (user) {
                req.user = user;
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
