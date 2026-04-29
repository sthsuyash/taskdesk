import { User, UserPayload } from '@/models/user.model';

export interface ListUsersOptions {
    roleId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    list(options: ListUsersOptions): Promise<PaginatedResult<User>>;
    create(data: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User>;
    update(id: string, data: Partial<UserPayload>): Promise<User>;
    delete(id: string): Promise<void>;
}
