import { Router, type Request, type Response } from 'express';
import type { Store } from '../db/store.js';

interface ApiRouterDependencies {
    store: Store;
    broadcastToViewers: (sessionId: string, events: unknown[]) => void;
}

export function createApiRouter({ store, broadcastToViewers }: ApiRouterDependencies) {
    const router = Router();

    router.post('/sessions', async (req: Request, res: Response) => {
        try {
            const result = await store.createSession({
                url: req.body.url,
                userAgent: req.body.userAgent,
            });

            res.json(result);
        } catch (error) {
            console.error('createSession error:', error);
            res.status(500).json({ error: 'Failed to create session' });
        }
    });

    router.post('/sessions/:id/events', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const { events } = req.body as { events?: unknown[] };

        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'events must be a non-empty array' });
        }

        const session = await store.appendEvents(id, events);
        broadcastToViewers(id, events);

        return res.json({ ok: true, received: events.length, total: session.event_count });
    });

    router.get('/sessions', async (_req: Request, res: Response) => {
        const sessions = await store.listSessions();
        res.json({ sessions });
    });

    router.get('/sessions/:id/events', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const events = await store.getSessionEvents(id);
        if (!events) {
            return res.status(404).json({ error: 'Session not found' });
        }

        return res.json({ events });
    });

    router.delete('/sessions/:id', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const result = await store.deleteSession(id);
        res.json(result);
    });

    router.get('/tasks', async (_req: Request, res: Response) => {
        const tasks = await store.listTasks();
        res.json({ tasks });
    });

    router.post('/tasks', (req: Request, res: Response) => {
        const result = store.createTask(req.body);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        return res.status(result.statusCode).json({ task: result.task });
    });

    router.put('/tasks/:id', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const result = await store.updateTask(id, req.body);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        return res.json({ task: result.task });
    });

    router.delete('/tasks/:id', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const result = await store.deleteTask(id);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        return res.json({ ok: true });
    });

    return router;
}