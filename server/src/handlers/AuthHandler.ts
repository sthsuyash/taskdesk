import { getAuthTokenFromRequest, setAuthCookie, clearAuthCookie } from '@/lib/auth-utils';
import { AuditService } from '@/services/AuditService';
import { AuthService } from '@/services/AuthService';
import { Request, Response } from 'express';

export class AuthHandler {
    constructor(
        private readonly authService: AuthService,
        private readonly auditService: AuditService
    ) {}

    async register(req: Request, res: Response) {
        const result = await this.authService.register(req.body);

        await this.auditService.log({
            userId: result.user.id,
            action: 'registered',
            entityType: 'User',
            entityId: result.user.id,
            details: { email: result.user.email },
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        setAuthCookie(res, result.refreshToken);
        res.status(201).json({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }

    async login(req: Request, res: Response) {
        const result = await this.authService.login(req.body);

        await this.auditService.log({
            userId: result.user.id,
            action: 'login',
            entityType: 'User',
            details: { email: result.user.email },
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        setAuthCookie(res, result.refreshToken);
        res.json({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }

    async logout(req: Request, res: Response) {
        const refreshToken = getAuthTokenFromRequest(req);
        
        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        clearAuthCookie(res);
        res.json({ ok: true });
    }

    async refresh(req: Request, res: Response) {
        const refreshToken = getAuthTokenFromRequest(req);
        
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token required' });
        }

        const result = await this.authService.refreshTokens(refreshToken);
        
        setAuthCookie(res, result.refreshToken);
        res.json({
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }

    async me(req: Request, res: Response) {
        res.json({ user: req.user });
    }
}