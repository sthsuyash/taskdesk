import { AuthSession } from '@/models/auth.model';
import { AuthRepository } from '@/repositories/AuthRepository';
import { AuthSession as PrismaAuthSession, PrismaClient, User as PrismaUser } from '@prisma/client';

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
        await this.prisma.authSession.delete({ where: { id } });
    }

    async deleteExpiredSessions(): Promise<void> {
        await this.prisma.authSession.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
    }
}
