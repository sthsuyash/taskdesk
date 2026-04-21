export type TaskStatus = 'todo' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: number;
    updatedAt: number;
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

export type RecorderState = 'initializing' | 'recording' | 'error';
