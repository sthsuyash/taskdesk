import { ForbiddenError, NotFoundError } from '@/domain/errors/AppError';
import { AuthActor } from '@/models/auth.model';
import { SessionRepository } from '@/repositories/SessionRepository';

const ROLE_LEVELS: Record<string, number> = {
    admin: 100,
    support: 50,
    user: 1,
};

export class SessionService {
    constructor(private readonly sessionRepository: SessionRepository) {}

    async listSessions(actor: AuthActor, page?: number, limit?: number) {
        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;
        if (actorLevel < 50) {
            throw new ForbiddenError();
        }
        return this.sessionRepository.list({ page, limit });
    }

    async getSession(actor: AuthActor, id: string) {
        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;
        if (actorLevel < 50) {
            throw new ForbiddenError();
        }

        const session = await this.sessionRepository.findByIdWithEvents(id);
        if (!session) {
            throw new NotFoundError('Session not found');
        }

        return session;
    }

    async createSession(payload: {
        id: string;
        url: string;
        userAgent: string;
        ipAddress: string;
        userId?: string;
    }) {
        return this.sessionRepository.create({
            id: payload.id,
            url: payload.url,
            userAgent: payload.userAgent,
            ipAddress: payload.ipAddress,
            userId: payload.userId || '',
        });
    }

    async addEvents(id: string, events: unknown[]) {
        const session = await this.sessionRepository.findById(id);
        if (!session) {
            throw new NotFoundError('Session not found');
        }

        await this.sessionRepository.addEvents(id, events);
    }

    async deleteSession(actor: AuthActor, id: string) {
        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;
        if (actorLevel < 100) {
            throw new ForbiddenError();
        }

        const session = await this.sessionRepository.findById(id);
        if (!session) {
            throw new NotFoundError('Session not found');
        }

        await this.sessionRepository.delete(id);
    }
}
