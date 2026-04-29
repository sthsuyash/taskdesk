import { Session, SessionWithEvents } from '@/models/session.model';
import {
    ListSessionsOptions,
    PaginatedResult,
    SessionRepository,
} from '@/repositories/SessionRepository';
import {
    Prisma,
    PrismaClient,
    Session as PrismaSession,
    SessionEvent as PrismaSessionEvent,
} from '@prisma/client';

export class PrismaSessionRepository implements SessionRepository {
    constructor(private readonly prisma: PrismaClient) {}

    private mapToDomain(session: PrismaSession): Session {
        return {
            id: session.id,
            url: session.url,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
            startedAt: session.startedAt.getTime(),
            lastEventAt: session.lastEventAt.getTime(),
            eventCount: session.eventCount,
            userId: session.userId ?? '',
        };
    }

    async findById(id: string): Promise<Session | null> {
        const session = await this.prisma.session.findUnique({ where: { id } });
        return session ? this.mapToDomain(session) : null;
    }

    async findByIdWithEvents(id: string): Promise<SessionWithEvents | null> {
        const session = await this.prisma.session.findUnique({
            where: { id },
            include: { sessionEvent: true },
        });

        if (!session) return null;

        return {
            ...this.mapToDomain(session),
            events: (session.sessionEvent?.events as unknown[]) || [],
        };
    }

    async list(options: ListSessionsOptions): Promise<PaginatedResult<Session>> {
        const { userId, page = 1, limit = 20 } = options;
        const where: PrismaSessionWhereInput = userId ? { userId } : {};

        const [sessions, total] = await Promise.all([
            this.prisma.session.findMany({
                where,
                orderBy: { startedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.session.count({ where }),
        ]);

        return {
            items: sessions.map(this.mapToDomain),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async create(
        data: Omit<Session, 'startedAt' | 'lastEventAt' | 'eventCount'>
    ): Promise<Session> {
        const session = await this.prisma.session.create({
            data: {
                id: data.id,
                url: data.url,
                userAgent: data.userAgent,
                ipAddress: data.ipAddress,
                userId: data.userId || null,
            },
        });
        return this.mapToDomain(session);
    }

    async addEvents(id: string, newEvents: unknown[]): Promise<void> {
        const now = new Date();

        await this.prisma.$transaction(async (tx) => {
            const existingEvent = await tx.sessionEvent.findUnique({
                where: { sessionId: id },
            });

            if (existingEvent) {
                const existing = (existingEvent.events as unknown[]) ?? [];
                const combinedEvents = [...existing, ...newEvents];
                await tx.sessionEvent.update({
                    where: { sessionId: id },
                    data: { events: combinedEvents as unknown as Prisma.InputJsonValue },
                });
            } else {
                await tx.sessionEvent.create({
                    data: {
                        sessionId: id,
                        events: newEvents as unknown as Prisma.InputJsonValue,
                    },
                });
            }

            await tx.session.update({
                where: { id },
                data: {
                    lastEventAt: now,
                    eventCount: { increment: newEvents.length },
                },
            });
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.session.delete({ where: { id } });
    }
}

type PrismaSessionWhereInput = {
    userId?: string;
};
