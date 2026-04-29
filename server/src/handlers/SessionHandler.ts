import { BadRequestError } from '@/domain/errors/AppError';
import { AuthActor } from '@/models/auth.model';
import { AuditService } from '@/services/AuditService';
import { SessionService } from '@/services/SessionService';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export class SessionHandler {
    constructor(
        private readonly sessionService: SessionService,
        private readonly auditService: AuditService,
        private readonly broadcast: (sessionId: string, events: unknown[]) => void
    ) {}

    async createSession(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const id = uuidv4();
        const session = await this.sessionService.createSession({
            id,
            url: req.body.url,
            userAgent: req.body.userAgent,
            ipAddress: req.ip || req.socket.remoteAddress || '',
            userId: actor.id,
        });

        await this.auditService.log({
            userId: actor.id,
            action: 'created',
            entityType: 'Session',
            entityId: session.id,
            details: { url: req.body.url },
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.json(session);
    }

    async addEvents(req: Request, res: Response) {
        const { events } = req.body as { events?: unknown[] };
        if (!Array.isArray(events) || events.length === 0) {
            throw new BadRequestError('events must be a non-empty array');
        }

        const id = String(req.params.id);
        await this.sessionService.addEvents(id, events);
        this.broadcast(id, events);
        res.json({ ok: true });
    }

    async listSessions(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await this.sessionService.listSessions(actor, page, limit);
        res.json(result);
    }

    async getSession(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const id = String(req.params.id);
        const session = await this.sessionService.getSession(actor, id);

        await this.auditService.log({
            userId: actor.id,
            action: 'viewed',
            entityType: 'Session',
            entityId: session.id,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.json(session);
    }

    async deleteSession(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const id = String(req.params.id);
        await this.sessionService.deleteSession(actor, id);

        await this.auditService.log({
            userId: actor.id,
            action: 'deleted',
            entityType: 'Session',
            entityId: id,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.json({ ok: true });
    }
}
