import { apiClient } from '@/services/apiClient';
import type { SessionEventsResponse, SessionsResponse } from '@/types';

export function createSession() {
    return apiClient.post<{ sessionId: string }>('/api/sessions', {
        url: window.location.href,
        userAgent: navigator.userAgent,
    });
}

export function postSessionEvents(sessionId: string, events: unknown[]) {
    return apiClient.post<{ ok: true; received: number; total: number }>(`/api/sessions/${sessionId}/events`, { events });
}

export function listSessions() {
    return apiClient.get<SessionsResponse>('/api/sessions');
}

export function getSessionEvents(sessionId: string) {
    return apiClient.get<SessionEventsResponse>(`/api/sessions/${sessionId}/events`);
}