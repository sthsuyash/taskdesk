import { AuthActor } from '@/models/auth.model';
import { AuditService } from '@/services/AuditService';
import { UserService } from '@/services/UserService';
import { Request, Response } from 'express';

export class UserHandler {
    constructor(
        private readonly userService: UserService,
        private readonly auditService: AuditService
    ) {}

    async listUsers(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const roleId = req.query.roleId as string;
        const sortBy = req.query.sortBy as string;
        const sortOrder = req.query.sortOrder as 'asc' | 'desc';

        const result = await this.userService.listUsers(
            actor,
            page,
            limit,
            roleId,
            sortBy,
            sortOrder
        );
        res.json(result);
    }

    async createUser(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const user = await this.userService.createUser(actor, req.body);

        await this.auditService.log({
            userId: actor.id,
            action: 'created',
            entityType: 'User',
            entityId: user.id,
            details: { email: user.email, roleId: user.roleId },
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.status(201).json({ user });
    }

    async updateUser(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const id = String(req.params.id);
        const user = await this.userService.updateUser(actor, id, req.body);

        await this.auditService.log({
            userId: actor.id,
            action: 'updated',
            entityType: 'User',
            entityId: user.id,
            details: req.body,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.json({ user });
    }

    async deleteUser(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const id = String(req.params.id);
        await this.userService.deleteUser(actor, id);

        await this.auditService.log({
            userId: actor.id,
            action: 'deleted',
            entityType: 'User',
            entityId: id,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.json({ ok: true });
    }
}
