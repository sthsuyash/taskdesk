import { ForbiddenError } from '@/domain/errors/AppError';
import { AuthActor } from '@/models/auth.model';
import { AuditRepository } from '@/repositories/AuditRepository';

const ROLE_LEVELS: Record<string, number> = {
    admin: 100,
    support: 50,
    user: 1,
};

export class AuditService {
    constructor(private readonly auditRepository: AuditRepository) {}

    async listAuditLogs(actor: AuthActor, page = 1, limit = 20) {
        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;
        if (actorLevel < 50) {
            throw new ForbiddenError();
        }

        // Admin/support can see all logs
        return this.auditRepository.listAll(page, limit);
    }

    async listByEntity(entityType: string, entityId: string) {
        return this.auditRepository.listByEntity(entityType, entityId);
    }

    async log(params: {
        userId: string;
        action: string;
        entityType: string;
        entityId?: string;
        details?: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
    }) {
        return this.auditRepository.create({
            userId: params.userId,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            details: params.details,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
        });
    }
}
