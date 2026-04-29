import { getAuthTokenFromRequest } from '@/lib/auth-utils';
import { AuditService } from '@/services/AuditService';
import { AuthService } from '@/services/AuthService';
import { Request, Response } from 'express';

export class AuthHandler {
    constructor(
        private readonly authService: AuthService,
        private readonly auditService: AuditService
    ) {}

    async register(req: Request, res: Response) {
        const user = await this.authService.register(req.body);
        const sessionToken = await this.authService.createSession(user.id);

        await this.auditService.log({
            userId: user.id,
            action: 'registered',
            entityType: 'User',
            entityId: user.id,
            details: { email: user.email },
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.status(201).json({ user, token: sessionToken });
    }

    async login(req: Request, res: Response) {
        const user = await this.authService.login(req.body);
        const sessionToken = await this.authService.createSession(user.id);

        await this.auditService.log({
            userId: user.id,
            action: 'login',
            entityType: 'AuthSession',
            details: { email: user.email },
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.json({ user, token: sessionToken });
    }

    async logout(req: Request, res: Response) {
        const token = getAuthTokenFromRequest(req);
        if (token) {
            const session = await this.authService.getSession(token);
            if (session) {
                await this.auditService.log({
                    userId: session.id,
                    action: 'logout',
                    entityType: 'AuthSession',
                    ipAddress: req.ip || req.socket.remoteAddress || undefined,
                    userAgent: req.headers['user-agent'],
                });
            }
            await this.authService.logout(token);
        }
        res.json({ ok: true });
    }

    async me(req: Request, res: Response) {
        res.json({ user: req.user });
    }
}
