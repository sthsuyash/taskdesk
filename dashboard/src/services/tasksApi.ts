import { apiClient } from '@/services/apiClient';
import type { TaskPayload, TaskResponse, TasksResponse } from '@/types';

export function listTasks(page = 1, limit = 20, status?: 'todo' | 'done') {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return apiClient.get<TasksResponse>(`/api/tasks?${params}`);
}

export function createTask(payload: TaskPayload) {
    return apiClient.post<TaskResponse>('/api/tasks', payload);
}

export function updateTask(id: string, payload: TaskPayload) {
    return apiClient.put<TaskResponse>(`/api/tasks/${id}`, payload);
}

export function deleteTask(id: string) {
    return apiClient.delete<{ ok: true }>(`/api/tasks/${id}`);
}
