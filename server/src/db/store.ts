import { Pool, type PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type TaskStatus = 'todo' | 'done';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: number;
    updatedAt: number;
}

export interface SessionSummary {
    id: string;
    url: string;
    userAgent: string;
    startedAt: number;
    lastEventAt: number;
    eventCount: number;
    durationMs: number;
}

export interface Store {
    createSession(meta?: { url?: string; userAgent?: string }): Promise<{ sessionId: string }>;
    appendEvents(sessionId: string, events: unknown[]): Promise<SessionRow>;
    getSessionEvents(sessionId: string): Promise<unknown[] | null>;
    listSessions(): Promise<SessionSummary[]>;
    deleteSession(sessionId: string): Promise<{ ok: true }>;
    listTasks(): Promise<Task[]>;
    createTask(payload: TaskPayload):
        | { task: Task; statusCode: 201 }
        | { error: string; statusCode: number };
    updateTask(id: string, payload: TaskPayload): Promise<{ task: Task } | { error: string; statusCode: number }>;
    deleteTask(id: string): Promise<{ ok: true } | { error: string; statusCode: number }>;
    close(): Promise<void>;
}

interface StoreConfig {
    connectionString: string;
}

interface TaskPayload {
    title?: string;
    description?: string;
    status?: string;
}

interface TaskRow {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    created_at: Date;
    updated_at: Date;
}

interface SessionRow {
    id: string;
    url: string;
    user_agent: string;
    started_at: Date;
    last_event_at: Date;
    event_count: number;
}

function mapTaskRow(task: TaskRow): Task {
    return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        createdAt: task.created_at.getTime(),
        updatedAt: task.updated_at.getTime(),
    };
}

function mapSessionRow(session: SessionRow): SessionSummary {
    const startedAt = session.started_at.getTime();
    const lastEventAt = session.last_event_at.getTime();
    return {
        id: session.id,
        url: session.url,
        userAgent: session.user_agent,
        startedAt,
        lastEventAt,
        eventCount: session.event_count,
        durationMs: lastEventAt - startedAt,
    };
}

export async function createStore({ connectionString }: StoreConfig): Promise<Store> {
    const pool = new Pool({ connectionString });

    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                url TEXT DEFAULT 'unknown',
                user_agent TEXT DEFAULT '',
                started_at TIMESTAMP NOT NULL DEFAULT NOW(),
                last_event_at TIMESTAMP NOT NULL DEFAULT NOW(),
                event_count INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS session_events (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                events TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'todo',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
        `);
    } finally {
        client.release();
    }

    async function ensureSession(client: PoolClient, id: string, meta: { url?: string; userAgent?: string } = {}) {
        await client.query(
            `INSERT INTO sessions (id, url, user_agent, started_at, last_event_at, event_count)
             VALUES ($1, $2, $3, NOW(), NOW(), 0)
             ON CONFLICT (id) DO NOTHING`,
            [id, meta.url || 'unknown', meta.userAgent || '']
        );
    }

    return {
        async createSession(meta = {}) {
            const id = uuidv4();
            const client = await pool.connect();
            try {
                await ensureSession(client, id, meta);
            } finally {
                client.release();
            }
            return { sessionId: id };
        },

        async appendEvents(sessionId, events) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await ensureSession(client, sessionId);
                await client.query(
                    `INSERT INTO session_events (session_id, events, created_at) VALUES ($1, $2, NOW())`,
                    [sessionId, JSON.stringify(events)]
                );
                await client.query(
                    `UPDATE sessions SET last_event_at = NOW(), event_count = event_count + $1 WHERE id = $2`,
                    [events.length, sessionId]
                );
                await client.query('COMMIT');

                const result = await client.query<SessionRow>(
                    `SELECT * FROM sessions WHERE id = $1`,
                    [sessionId]
                );
                return result.rows[0];
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        },

        async getSessionEvents(sessionId) {
            const client = await pool.connect();
            try {
                const sessionResult = await client.query<SessionRow>(
                    `SELECT * FROM sessions WHERE id = $1`,
                    [sessionId]
                );
                if (sessionResult.rows.length === 0) {
                    return null;
                }

                const eventsResult = await client.query<{ events: string }>(
                    `SELECT events FROM session_events WHERE session_id = $1 ORDER BY id ASC`,
                    [sessionId]
                );
                return eventsResult.rows.flatMap((row) => JSON.parse(row.events) as unknown[]);
            } finally {
                client.release();
            }
        },

        async listSessions() {
            const result = await pool.query<SessionRow>(
                `SELECT id, url, user_agent, started_at, last_event_at, event_count
                 FROM sessions ORDER BY started_at DESC`
            );
            return result.rows.map(mapSessionRow);
        },

        async deleteSession(sessionId) {
            await pool.query(`DELETE FROM session_events WHERE session_id = $1`, [sessionId]);
            await pool.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
            return { ok: true };
        },

        async listTasks() {
            const result = await pool.query<TaskRow>(
                `SELECT id, title, description, status, created_at, updated_at
                 FROM tasks ORDER BY created_at DESC`
            );
            return result.rows.map(mapTaskRow);
        },

        createTask(payload) {
            const title = typeof payload.title === 'string' ? payload.title.trim() : '';
            const description = typeof payload.description === 'string' ? payload.description.trim() : '';
            const status: TaskStatus = payload.status === 'done' ? 'done' : 'todo';

            if (!title) {
                return { error: 'title is required', statusCode: 400 };
            }

            const id = uuidv4();
            const now = new Date();

            pool.query(
                `INSERT INTO tasks (id, title, description, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                [id, title, description, status]
            );

            return {
                task: { id, title, description, status, createdAt: now.getTime(), updatedAt: now.getTime() },
                statusCode: 201
            };
        },

        async updateTask(id, payload) {
            const result = await pool.query<TaskRow>(
                `SELECT id, title, description, status, created_at, updated_at FROM tasks WHERE id = $1`,
                [id]
            );
            const existingTask = result.rows[0];
            if (!existingTask) {
                return { error: 'Task not found', statusCode: 404 };
            }

            const title = typeof payload.title === 'string' ? payload.title.trim() : existingTask.title;
            const description = typeof payload.description === 'string'
                ? payload.description.trim()
                : existingTask.description;
            const status: TaskStatus = payload.status === 'done' ? 'done' : 'todo';

            if (!title) {
                return { error: 'title is required', statusCode: 400 };
            }

            await pool.query(
                `UPDATE tasks SET title = $1, description = $2, status = $3, updated_at = NOW() WHERE id = $4`,
                [title, description, status, id]
            );

            const now = new Date();
            return {
                task: { id, title, description, status, createdAt: existingTask.created_at.getTime(), updatedAt: now.getTime() }
            };
        },

        deleteTask(id) {
            return pool.query(`DELETE FROM tasks WHERE id = $1`, [id])
                .then(result => {
                    if (result.rowCount === 0) {
                        return { error: 'Task not found', statusCode: 404 };
                    }
                    return { ok: true };
                }) as ReturnType<Store['deleteTask']>;
        },

        async close() {
            await pool.end();
        },
    };
}