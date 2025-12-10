import { AuthSession } from '@/models/auth.model';
import { AuthRepository, RefreshTokenData } from '@/repositories/AuthRepository';
import { AuthSession as PrismaAuthSession, PrismaClient, RefreshToken as PrismaRefreshToken, User as PrismaUser } from '@prisma/client';

export class PrismaAuthRepository implements AuthRepository {
    constructor(private readonly prisma: PrismaClient) {}

    private mapToDomain(session: PrismaAuthSession & { user: PrismaUser }): AuthSession {
        return {
            id: session.id,
            userId: session.userId,
            user: {
                id: session.user.id,
                email: session.user.email,
                roleId: session.user.roleId,
                createdAt: session.user.createdAt.getTime(),
                updatedAt: session.user.updatedAt.getTime(),
            },
            createdAt: session.createdAt.getTime(),
            lastSeenAt: session.lastSeenAt.getTime(),
            expiresAt: session.expiresAt.getTime(),
        };
    }

    async findSessionById(id: string): Promise<AuthSession | null> {
        const session = await this.prisma.authSession.findUnique({
            where: { id },
            include: { user: true },
        });
        return session ? this.mapToDomain(session) : null;
    }

    async createSession(data: {
        id: string;
        userId: string;
        expiresAt: number;
    }): Promise<AuthSession> {
        const session = await this.prisma.authSession.create({
            data: {
                id: data.id,
                userId: data.userId,
                expiresAt: new Date(data.expiresAt),
            },
            include: { user: true },
        });
        return this.mapToDomain(session);
    }

    async updateSessionLastSeen(id: string, lastSeenAt: number): Promise<void> {
        await this.prisma.authSession.update({
            where: { id },
            data: { lastSeenAt: new Date(lastSeenAt) },
        });
    }

    async deleteSession(id: string): Promise<void> {
        await this.prisma.authSession.delete({ where: { id } }).catch(() => undefined);
    }

    async deleteExpiredSessions(): Promise<void> {
        await this.prisma.authSession.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
    }

    async createRefreshToken(data: RefreshTokenData): Promise<void> {
        await this.prisma.refreshToken.create({
            data: {
                id: data.id,
                userId: data.userId,
                token: data.token,
                expiresAt: data.expiresAt,
            },
        });
    }

    async findRefreshToken(token: string): Promise<RefreshTokenData | null> {
        const refreshToken = await this.prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!refreshToken || refreshToken.revoked || refreshToken.expiresAt < new Date()) {
            return null;
        }
        return {
            id: refreshToken.id,
            userId: refreshToken.userId,
            token: refreshToken.token,
            expiresAt: refreshToken.expiresAt,
        };
    }

    async revokeRefreshToken(token: string): Promise<void> {
        await this.prisma.refreshToken.update({
            where: { token },
            data: { revoked: true },
        }).catch(() => undefined);
    }

    async revokeAllUserRefreshTokens(userId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { userId },
            data: { revoked: true },
        });
    }

    async deleteExpiredRefreshTokens(): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { revoked: true },
                ],
            },
        });
    }
}
