export interface AuditLog {
    id: string;
    userId: string;
    action: string; // "created", "updated", "deleted", "login", "logout"
    entityType: string; // "Task", "User", "Session", "AuthSession"
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: number;
}

export type AuditAction = 'created' | 'updated' | 'deleted' | 'login' | 'logout' | 'viewed';

export interface CreateAuditLogInput {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}
