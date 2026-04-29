import { AuthActor } from '@/models/auth.model';
import { AuditService } from '@/services/AuditService';
import { Request, Response } from 'express';

export class AuditHandler {
    constructor(private readonly auditService: AuditService) {}

    async listAuditLogs(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await this.auditService.listAuditLogs(actor, page, limit);
        res.json(result);
    }

    async listByEntity(req: Request, res: Response) {
        const entityType = String(req.params.entityType);
        const entityId = String(req.params.entityId);

        const logs = await this.auditService.listByEntity(entityType, entityId);
        res.json({ logs });
    }
}
