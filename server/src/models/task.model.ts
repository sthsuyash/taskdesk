export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface Task {
    id: string;
    title: string;
    description: string;
    statusId: TaskStatus;
    createdAt: number;
    updatedAt: number;
    userId: string;
}

export interface TaskPayload {
    title?: string;
    description?: string;
    statusId?: TaskStatus;
}
