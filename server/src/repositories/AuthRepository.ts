import { AuthSession } from '@/models/auth.model';

export interface AuthRepository {
    findSessionById(id: string): Promise<AuthSession | null>;
    createSession(data: { id: string; userId: string; expiresAt: number }): Promise<AuthSession>;
    updateSessionLastSeen(id: string, lastSeenAt: number): Promise<void>;
    deleteSession(id: string): Promise<void>;
    deleteExpiredSessions(): Promise<void>;
}
