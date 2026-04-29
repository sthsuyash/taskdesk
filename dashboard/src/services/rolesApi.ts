import { apiClient } from './apiClient';

export interface Role {
    id: string;
    name: string;
    description: string | null;
    level: number;
}

export interface RolesResponse {
    roles: Role[];
}

export function listRoles() {
    return apiClient.get<RolesResponse>('/api/roles');
}

export interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: number;
}

export interface AuditLogsResponse {
    items: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function listAuditLogs(page = 1, limit = 20) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return apiClient.get<AuditLogsResponse>(`/api/audit?${params}`);
}

export function getAuditLogsByEntity(entityType: string, entityId: string) {
    return apiClient.get<{ logs: AuditLog[] }>(`/api/audit/entity/${entityType}/${entityId}`);
}
