export type AuthRole = 'admin' | 'support' | 'user';

export interface AuthUser {
    id: string;
    email: string;
    roleId: string;
    createdAt: number;
    updatedAt: number;
}

export interface AuthActor {
    id: string;
    roleId: string;
}

export interface AuthSession {
    id: string;
    userId: string;
    user: AuthUser;
    createdAt: number;
    lastSeenAt: number;
    expiresAt: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
