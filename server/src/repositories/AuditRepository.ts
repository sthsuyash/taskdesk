import { AuditLog as AuditLogType } from '@/models/audit.model';

export interface AuditRepository {
    create(data: Omit<AuditLogType, 'id' | 'createdAt'>): Promise<AuditLogType>;
    listByEntity(entityType: string, entityId: string): Promise<AuditLogType[]>;
    listByUser(
        userId: string,
        page?: number,
        limit?: number
    ): Promise<{ items: AuditLogType[]; total: number }>;
    listAll(
        page?: number,
        limit?: number
    ): Promise<{
        items: AuditLogType[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
