import { AuthSession } from '@/models/auth.model';

export interface RefreshTokenData {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
}

export interface AuthRepository {
    findSessionById(id: string): Promise<AuthSession | null>;
    createSession(data: { id: string; userId: string; expiresAt: number }): Promise<AuthSession>;
    updateSessionLastSeen(id: string, lastSeenAt: number): Promise<void>;
    deleteSession(id: string): Promise<void>;
    deleteExpiredSessions(): Promise<void>;
    createRefreshToken(data: RefreshTokenData): Promise<void>;
    findRefreshToken(token: string): Promise<RefreshTokenData | null>;
    revokeRefreshToken(token: string): Promise<void>;
    revokeAllUserRefreshTokens(userId: string): Promise<void>;
    deleteExpiredRefreshTokens(): Promise<void>;
}
