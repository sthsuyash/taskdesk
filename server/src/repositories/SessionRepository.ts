import { Session, SessionWithEvents } from '@/models/session.model';

export interface ListSessionsOptions {
    userId?: string;
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

export interface SessionRepository {
    findById(id: string): Promise<Session | null>;
    findByIdWithEvents(id: string): Promise<SessionWithEvents | null>;
    list(options: ListSessionsOptions): Promise<PaginatedResult<Session>>;
    create(data: Omit<Session, 'startedAt' | 'lastEventAt' | 'eventCount'>): Promise<Session>;
    addEvents(id: string, events: unknown[]): Promise<void>;
    delete(id: string): Promise<void>;
}
