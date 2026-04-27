export type TaskStatus = 'todo' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: number;
    updatedAt: number;
    userId: string;
}

export interface TaskPayload {
    title: string;
    description: string;
    status: TaskStatus;
}

export interface SessionSummary {
    id: string;
    url: string;
    userAgent: string;
    startedAt: number;
    lastEventAt: number;
    eventCount: number;
    durationMs: number;
    userId: string;
}

export interface SessionsResponse {
    sessions: SessionSummary[];
}

export interface SessionEventsResponse {
    events: unknown[];
}

export interface TasksResponse {
    tasks: Task[];
}

export interface TaskResponse {
    task: Task;
}

export interface AuthUser {
    id: string;
    email: string;
    role: 'user' | 'support' | 'admin';
    createdAt: number;
    updatedAt: number;
}

export interface AuthResponse {
    user: AuthUser;
}

export interface CurrentUserResponse {
    user: AuthUser;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface RegisterPayload extends LoginPayload {
    name?: string;
}

export interface UsersResponse {
    users: AuthUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface UserPayload {
    email: string;
    role: AuthUser['role'];
    password?: string;
}

export type RecorderState = 'initializing' | 'recording' | 'error';