import { apiClient } from '@/services/apiClient';
import type { AuthUser, CurrentUserResponse } from '@/types';

export function getCurrentUser() {
    return apiClient.get<CurrentUserResponse>('/api/auth/me');
}

export function updateProfile(payload: { email?: string; password?: string }) {
    return apiClient.put<{ user: AuthUser }>('/api/users/me', payload);
}