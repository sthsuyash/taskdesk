import { type Request, type Response, Router } from 'express';
import {
    clearAuthCookie,
    getAuthTokenFromRequest,
    getCurrentUserFromRequest,
    setAuthCookie,
} from '@/auth.js';
import type { AuthRole, Store, TaskStatus } from '@/db/store.js';

interface ApiRouterDependencies {
    store: Store;
    broadcastToViewers: (sessionId: string, events: unknown[]) => void;
}

export function createApiRouter({ store, broadcastToViewers }: ApiRouterDependencies) {
    const router = Router();

    router.get('/', async (_req: Request, res: Response) => {
        res.json({
            message: 'Welcome to Taskdesk API',
            version: '1.0.0',
            docs: '/api-docs',
        });
    });

    router.get('/health', async (_req: Request, res: Response) => {
        res.json({ status: 'ok' });
    });

    router.post('/auth/register', async (req: Request, res: Response) => {
        const result = await store.registerUser({
            email: req.body.email,
            password: req.body.password,
        });

        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        const { sessionToken } = await store.createAuthSession(result.user.id);
        setAuthCookie(res, sessionToken);
        return res.status(201).json({ user: result.user });
    });

    router.post('/auth/login', async (req: Request, res: Response) => {
        const result = await store.authenticateUser({
            email: req.body.email,
            password: req.body.password,
        });

        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        const { sessionToken } = await store.createAuthSession(result.user.id);
        setAuthCookie(res, sessionToken);
        return res.json({ user: result.user });
    });

    router.post('/auth/logout', async (req: Request, res: Response) => {
        const token = getAuthTokenFromRequest(req);
        if (token) {
            await store.deleteAuthSession(token);
        }

        clearAuthCookie(res);
        return res.json({ ok: true });
    });

    router.get('/auth/me', async (req: Request, res: Response) => {
        const user = await getCurrentUserFromRequest(req, store);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.json({ user });
    });

    router.post('/sessions', async (req: Request, res: Response) => {
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const result = await store.createSession(
                {
                    url: req.body.url,
                    userAgent: req.body.userAgent,
                    ipAddress: req.ip || req.socket.remoteAddress || '',
                },
                actor.id
            );

            res.json(result);
        } catch (error) {
            console.error('createSession error:', error);
            res.status(500).json({ error: 'Failed to create session' });
        }
    });

    router.post('/sessions/:id/events', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const { events } = req.body as { events?: unknown[] };
        const actor = await getCurrentUserFromRequest(req, store);

        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'events must be a non-empty array' });
        }

        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const session = await store.appendEvents(id, events, actor);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        broadcastToViewers(id, events);

        return res.json({ ok: true, received: events.length, total: session.event_count });
    });

    router.get('/sessions', async (req: Request, res: Response) => {
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (actor.role !== 'admin' && actor.role !== 'support') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
        const result = await store.listSessions(actor, page, limit);
        res.json(result);
    });

    router.get('/sessions/:id/events', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (actor.role !== 'admin' && actor.role !== 'support') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const events = await store.getSessionEvents(id, actor);
        if (!events) {
            return res.status(404).json({ error: 'Session not found' });
        }

        return res.json({ events });
    });

    router.delete('/sessions/:id', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (actor.role !== 'admin' && actor.role !== 'support') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const result = await store.deleteSession(id, actor);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        res.json(result);
    });

    router.get('/tasks', async (req: Request, res: Response) => {
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
        const status = req.query.status as TaskStatus | undefined;

        const result = await store.listTasks(actor, page, limit, status);
        res.json(result);
    });

    router.post('/tasks', async (req: Request, res: Response) => {
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await store.createTask(req.body, actor);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        return res.status(result.statusCode).json({ task: result.task });
    });

    router.put('/tasks/:id', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await store.updateTask(id, req.body, actor);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        return res.json({ task: result.task });
    });

    router.delete('/tasks/:id', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await store.deleteTask(id, actor);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        res.json(result);
    });

    router.get('/users', async (req: Request, res: Response) => {
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (actor.role !== 'admin' && actor.role !== 'support') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
        const sortBy = String(req.query.sortBy || 'created_at');
        const sortOrder = String(req.query.sortOrder || 'desc');

        let role: AuthRole | undefined;
        if (req.query.role && ['user', 'admin', 'support'].includes(req.query.role as string)) {
            role = req.query.role as AuthRole;
        }

        if (actor.role === 'support') {
            role = 'user';
        }

        const result = await store.listUsers(page, limit, role, sortBy, sortOrder);
        res.json({
            users: result.users,
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        });
    });

    router.post('/users', async (req: Request, res: Response) => {
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (actor.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { email, password, role } = req.body as {
            email?: string;
            password?: string;
            role?: string;
        };
        if (!email || !password || !role) {
            return res.status(400).json({ error: 'email, password, role required' });
        }
        if (!['user', 'admin', 'support'].includes(role)) {
            return res.status(400).json({ error: 'invalid role' });
        }

        const result = await store.createUser({ email, password, role: role as AuthRole }, actor);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }
        res.json({ user: result.user });
    });

    router.put('/users/:id', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (actor.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const result = await store.updateUser(id, req.body, actor);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }

        res.json({ user: result.user });
    });

    router.delete('/users/:id', async (req: Request, res: Response) => {
        const id = String(req.params.id);
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (actor.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const result = await store.deleteUser(id, actor);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }
        res.json({ ok: true });
    });

    router.put('/users/me', async (req: Request, res: Response) => {
        const actor = await getCurrentUserFromRequest(req, store);
        if (!actor) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { email, password } = req.body as { email?: string; password?: string };
        const payload: { email?: string; password?: string } = {};
        if (email) payload.email = email;
        if (password) payload.password = password;

        const result = await store.updateUser(actor.id, payload, actor);
        if ('error' in result) {
            return res.status(result.statusCode).json({ error: result.error });
        }
        res.json({ user: result.user });
    });

    return router;
}
