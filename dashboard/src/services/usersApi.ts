import { apiClient } from '@/services/apiClient';
import type { AuthUser, UsersResponse, UserPayload } from '@/types';

export function listUsers(page = 1, limit = 20, role?: AuthUser['role']) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (role) params.set('role', role);
    return apiClient.get<UsersResponse>(`/api/users?${params}`);
}

export function createUser(payload: UserPayload) {
    return apiClient.post<{ user: AuthUser }>('/api/users', payload);
}

export function updateUser(id: string, payload: Partial<UserPayload>) {
    return apiClient.put<{ user: AuthUser }>(`/api/users/${id}`, payload);
}

export function deleteUser(id: string) {
    return apiClient.delete<{ ok: true }>(`/api/users/${id}`);
}