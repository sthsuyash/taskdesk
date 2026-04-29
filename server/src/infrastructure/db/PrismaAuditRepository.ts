import { AuditLog } from '@/models/audit.model';
import { AuditRepository } from '@/repositories/AuditRepository';
import { Prisma, AuditLog as PrismaAuditLog, PrismaClient } from '@prisma/client';

export class PrismaAuditRepository implements AuditRepository {
    constructor(private readonly prisma: PrismaClient) {}

    private mapToDomain(log: PrismaAuditLog): AuditLog {
        return {
            id: log.id,
            userId: log.userId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId ?? undefined,
            details: log.details as Record<string, unknown> | undefined,
            ipAddress: log.ipAddress ?? undefined,
            userAgent: log.userAgent ?? undefined,
            createdAt: log.createdAt.getTime(),
        };
    }

    async create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
        const log = await this.prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                details: data.details as Prisma.InputJsonValue,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });
        return this.mapToDomain(log);
    }

    async listByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
        const logs = await this.prisma.auditLog.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return logs.map(this.mapToDomain);
    }

    async listByUser(
        userId: string,
        page = 1,
        limit = 20
    ): Promise<{ items: AuditLog[]; total: number }> {
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count({ where: { userId } }),
        ]);
        return { items: logs.map(this.mapToDomain), total };
    }

    async listAll(
        page = 1,
        limit = 20
    ): Promise<{
        items: AuditLog[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.auditLog.count(),
        ]);

        return {
            items: logs.map(this.mapToDomain),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
}
