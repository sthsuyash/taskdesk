import { Task, TaskPayload, TaskStatus as TaskStatusType } from '@/models/task.model';

export interface ListTasksOptions {
    userId?: string;
    statusId?: TaskStatusType;
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface TaskRepository {
    findById(id: string): Promise<Task | null>;
    list(options: ListTasksOptions): Promise<PaginatedResult<Task>>;
    create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Task>;
    update(id: string, data: TaskPayload): Promise<Task>;
    delete(id: string): Promise<void>;
}
