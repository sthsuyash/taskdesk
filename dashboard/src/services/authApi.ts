import { apiClient } from '@/services/apiClient';
import type { AuthResponse, CurrentUserResponse, LoginPayload, RegisterPayload } from '@/types';

export function getCurrentUser() {
    return apiClient.get<CurrentUserResponse>('/api/auth/me');
}

export function login(payload: LoginPayload) {
    return apiClient.post<AuthResponse>('/api/auth/login', payload);
}

export function register(payload: RegisterPayload) {
    return apiClient.post<AuthResponse>('/api/auth/register', payload);
}

export function logout() {
    return apiClient.post<{ ok: true }>('/api/auth/logout', {});
}