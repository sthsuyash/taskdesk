import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type TaskStatus = 'todo' | 'done';
export type AuthRole = 'user' | 'support' | 'admin';

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    createdAt: number;
    updatedAt: number;
    userId: string;
}

export interface SessionSummary {
    id: string;
    url: string;
    userAgent: string;
    startedAt: number;
    lastEventAt: number;
    eventCount: number;
    durationMs: number;
    userId: string;
}

export interface AuthUser {
    id: string;
    email: string;
    role: AuthRole;
    createdAt: number;
    updatedAt: number;
}

export interface AuthActor {
    id: string;
    role: AuthRole;
}

export interface Store {
    registerUser(payload: {
        email: string;
        password: string;
        role?: AuthRole;
    }): Promise<{ user: AuthUser } | { error: string; statusCode: number }>;
    authenticateUser(payload: {
        email: string;
        password: string;
    }): Promise<{ user: AuthUser } | { error: string; statusCode: number }>;
    createAuthSession(userId: string): Promise<{ sessionToken: string }>;
    getAuthSession(sessionToken: string): Promise<AuthUser | null>;
    deleteAuthSession(sessionToken: string): Promise<void>;
    createSession(
        meta?: { url?: string; userAgent?: string },
        userId?: string
    ): Promise<{ sessionId: string }>;
    appendEvents(
        sessionId: string,
        events: unknown[],
        actor?: AuthActor
    ): Promise<SessionRow | null>;
    getSessionEvents(sessionId: string, actor?: AuthActor): Promise<unknown[] | null>;
    listSessions(actor?: AuthActor): Promise<SessionSummary[]>;
    deleteSession(
        sessionId: string,
        actor?: AuthActor
    ): Promise<{ ok: true } | { error: string; statusCode: number }>;
    listTasks(actor?: AuthActor): Promise<Task[]>;
    createTask(
        payload: TaskPayload,
        actor?: AuthActor
    ): Promise<{ task: Task; statusCode: 201 } | { error: string; statusCode: number }>;
    updateTask(
        id: string,
        payload: TaskPayload,
        actor?: AuthActor
    ): Promise<{ task: Task } | { error: string; statusCode: number }>;
    deleteTask(
        id: string,
        actor?: AuthActor
    ): Promise<{ ok: true } | { error: string; statusCode: number }>;
    listUsers(
        page?: number,
        limit?: number,
        role?: AuthRole
    ): Promise<{ users: AuthUser[]; total: number }>;
    createUser(
        payload: { email: string; password: string; role: AuthRole },
        actor?: AuthActor
    ): Promise<{ user: AuthUser } | { error: string; statusCode: number }>;
    updateUser(
        id: string,
        payload: { email?: string; role?: AuthRole; password?: string },
        actor?: AuthActor
    ): Promise<{ user: AuthUser } | { error: string; statusCode: number }>;
    deleteUser(
        id: string,
        actor?: AuthActor
    ): Promise<{ ok: true } | { error: string; statusCode: number }>;
    close(): Promise<void>;
}

interface StoreConfig {
    connectionString: string;
    bootstrapAdmin?: {
        email: string;
        password: string;
    };
    bootstrapSupport?: {
        email: string;
        password: string;
    };
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
    user_id: string;
}

interface SessionRow {
    id: string;
    url: string;
    user_agent: string;
    started_at: Date;
    last_event_at: Date;
    event_count: number;
    user_id: string;
}

interface AuthUserRow {
    id: string;
    email: string;
    password_salt: string;
    password_hash: string;
    role: AuthRole;
    created_at: Date;
    updated_at: Date;
}

interface AuthSessionRow {
    id: string;
    user_id: string;
    created_at: Date;
    last_seen_at: Date;
    expires_at: Date;
}

interface AuthSessionLookupRow {
    id: string;
    user_id: string;
    session_created_at: Date;
    last_seen_at: Date;
    expires_at: Date;
    email: string;
    password_salt: string;
    password_hash: string;
    role: AuthRole;
    user_created_at: Date;
    updated_at: Date;
}

function mapTaskRow(task: TaskRow): Task {
    return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        createdAt: task.created_at.getTime(),
        updatedAt: task.updated_at.getTime(),
        userId: task.user_id,
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
        userId: session.user_id,
    };
}

function mapUserRow(user: AuthUserRow): AuthUser {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.created_at.getTime(),
        updatedAt: user.updated_at.getTime(),
    };
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
    const hash = pbkdf2Sync(password, salt, 210000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
    const { hash } = hashPassword(password, salt);
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export async function createStore({
    connectionString,
    bootstrapAdmin,
    bootstrapSupport,
}: StoreConfig): Promise<Store> {
    const pool = new Pool({ connectionString });
    let defaultOwnerUserId = '';

    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS auth_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMP NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                url TEXT DEFAULT 'unknown',
                user_agent TEXT DEFAULT '',
                started_at TIMESTAMP NOT NULL DEFAULT NOW(),
                last_event_at TIMESTAMP NOT NULL DEFAULT NOW(),
                event_count INTEGER DEFAULT 0,
                user_id TEXT DEFAULT ''
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
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                user_id TEXT DEFAULT ''
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
        `);

        await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT ''`);
        await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT ''`);

        if (bootstrapAdmin) {
            const adminEmail = normalizeEmail(bootstrapAdmin.email);
            const adminPassword = bootstrapAdmin.password.trim();

            if (adminEmail && adminPassword) {
                const existingAdmin = await client.query<AuthUserRow>(
                    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
                    [adminEmail]
                );

                let adminId = existingAdmin.rows[0]?.id ?? '';
                if (!adminId) {
                    adminId = uuidv4();
                    const { salt, hash } = hashPassword(adminPassword);
                    await client.query(
                        `INSERT INTO users (id, email, password_salt, password_hash, role, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, 'admin', NOW(), NOW())`,
                        [adminId, adminEmail, salt, hash]
                    );
                } else if (existingAdmin.rows[0]?.role !== 'admin') {
                    await client.query(
                        `UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`,
                        [adminId]
                    );
                }

                await client.query(
                    `UPDATE sessions SET user_id = $1 WHERE user_id IS NULL OR user_id = ''`,
                    [adminId]
                );
                await client.query(
                    `UPDATE tasks SET user_id = $1 WHERE user_id IS NULL OR user_id = ''`,
                    [adminId]
                );
                defaultOwnerUserId = adminId;
            }
        }

        if (bootstrapSupport) {
            const supportEmail = normalizeEmail(bootstrapSupport.email);
            const supportPassword = bootstrapSupport.password.trim();

            if (supportEmail && supportPassword) {
                const existingSupport = await client.query<AuthUserRow>(
                    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
                    [supportEmail]
                );

                let supportId = existingSupport.rows[0]?.id ?? '';
                if (!supportId) {
                    supportId = uuidv4();
                    const { salt, hash } = hashPassword(supportPassword);
                    await client.query(
                        `INSERT INTO users (id, email, password_salt, password_hash, role, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, 'support', NOW(), NOW())`,
                        [supportId, supportEmail, salt, hash]
                    );
                } else if (existingSupport.rows[0]?.role !== 'support') {
                    await client.query(
                        `UPDATE users SET role = 'support', updated_at = NOW() WHERE id = $1`,
                        [supportId]
                    );
                }
            }
        }
    } finally {
        client.release();
    }

    async function ensureSession(
        client: PoolClient,
        id: string,
        meta: { url?: string; userAgent?: string } = {},
        userId = defaultOwnerUserId
    ) {
        await client.query(
            `INSERT INTO sessions (id, url, user_agent, started_at, last_event_at, event_count, user_id)
             VALUES ($1, $2, $3, NOW(), NOW(), 0, $4)
             ON CONFLICT (id) DO NOTHING`,
            [id, meta.url || 'unknown', meta.userAgent || '', userId || defaultOwnerUserId || '']
        );
    }

    async function ensureTaskOwnership(client: PoolClient, taskId: string, actor?: AuthActor) {
        const result = await client.query<TaskRow & { owner_role: AuthRole }>(
            `SELECT t.*, u.role as owner_role
             FROM tasks t
             LEFT JOIN users u ON u.id = t.user_id
             WHERE t.id = $1`,
            [taskId]
        );
        const task = result.rows[0];
        if (!task) {
            return null;
        }

        if (actor?.role === 'admin') {
            return task;
        }

        if (actor?.role === 'support') {
            if (task.owner_role === 'support' || task.owner_role === 'admin') {
                return null;
            }
            return task;
        }

        if (actor?.id !== task.user_id) {
            return null;
        }

        return task;
    }

    function ensureUserModifiable(targetRole: AuthRole, actor?: AuthActor): boolean {
        if (actor?.role === 'admin') {
            return targetRole !== 'admin';
        }
        if (actor?.role === 'support') {
            return targetRole === 'user';
        }
        return false;
    }

    async function ensureSessionOwnership(
        client: PoolClient,
        sessionId: string,
        actor?: AuthActor
    ) {
        const result = await client.query<SessionRow>(`SELECT * FROM sessions WHERE id = $1`, [
            sessionId,
        ]);
        const session = result.rows[0];
        if (!session) {
            return null;
        }

        // Allow admins and support users to access sessions, or the session owner.
        if (
            actor?.role !== 'admin' &&
            actor?.role !== 'support' &&
            actor?.id !== session.user_id
        ) {
            return null;
        }

        return session;
    }

    return {
        async registerUser(payload) {
            const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : '';
            const password = typeof payload.password === 'string' ? payload.password.trim() : '';
            const role: AuthRole = payload.role === 'admin' ? 'admin' : 'user';

            if (!email) {
                return { error: 'email is required', statusCode: 400 };
            }

            if (!password || password.length < 8) {
                return { error: 'password must be at least 8 characters', statusCode: 400 };
            }

            const client = await pool.connect();
            try {
                const existing = await client.query<AuthUserRow>(
                    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
                    [email]
                );
                if (existing.rows.length > 0) {
                    return { error: 'Email already registered', statusCode: 409 };
                }

                const id = uuidv4();
                const { salt, hash } = hashPassword(password);
                await client.query(
                    `INSERT INTO users (id, email, password_salt, password_hash, role, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                    [id, email, salt, hash, role]
                );

                return {
                    user: {
                        id,
                        email,
                        role,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    },
                };
            } finally {
                client.release();
            }
        },

        async authenticateUser(payload) {
            const email = typeof payload.email === 'string' ? normalizeEmail(payload.email) : '';
            const password = typeof payload.password === 'string' ? payload.password.trim() : '';

            if (!email || !password) {
                return { error: 'email and password are required', statusCode: 400 };
            }

            const client = await pool.connect();
            try {
                const result = await client.query<AuthUserRow>(
                    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
                    [email]
                );
                const user = result.rows[0];
                if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
                    return { error: 'Invalid email or password', statusCode: 401 };
                }

                return { user: mapUserRow(user) };
            } finally {
                client.release();
            }
        },

        async createAuthSession(userId) {
            const token = uuidv4();
            const client = await pool.connect();
            try {
                await client.query(
                    `INSERT INTO auth_sessions (id, user_id, created_at, last_seen_at, expires_at)
                     VALUES ($1, $2, NOW(), NOW(), NOW() + INTERVAL '7 days')`,
                    [token, userId]
                );
            } finally {
                client.release();
            }

            return { sessionToken: token };
        },

        async getAuthSession(sessionToken) {
            const client = await pool.connect();
            try {
                const result = await client.query<AuthSessionLookupRow>(
                    `SELECT
                        s.id,
                        s.user_id,
                        s.created_at AS session_created_at,
                        s.last_seen_at,
                        s.expires_at,
                        u.email,
                        u.password_salt,
                        u.password_hash,
                        u.role,
                        u.created_at AS user_created_at,
                        u.updated_at
                     FROM auth_sessions s
                     INNER JOIN users u ON u.id = s.user_id
                     WHERE s.id = $1 AND s.expires_at > NOW()
                     LIMIT 1`,
                    [sessionToken]
                );

                const row = result.rows[0];
                if (!row) {
                    return null;
                }

                await client.query(`UPDATE auth_sessions SET last_seen_at = NOW() WHERE id = $1`, [
                    sessionToken,
                ]);

                return {
                    id: row.user_id,
                    email: row.email,
                    role: row.role,
                    createdAt: row.user_created_at.getTime(),
                    updatedAt: row.updated_at.getTime(),
                };
            } finally {
                client.release();
            }
        },

        async deleteAuthSession(sessionToken) {
            await pool.query(`DELETE FROM auth_sessions WHERE id = $1`, [sessionToken]);
        },

        async createSession(meta = {}, userId?: string) {
            const id = uuidv4();
            const client = await pool.connect();
            try {
                await ensureSession(client, id, meta, userId);
            } finally {
                client.release();
            }
            return { sessionId: id };
        },

        async appendEvents(sessionId, events, actor) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const session = await ensureSessionOwnership(client, sessionId, actor);
                if (!session) {
                    await client.query('ROLLBACK');
                    return null;
                }
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

        async getSessionEvents(sessionId, actor) {
            const client = await pool.connect();
            try {
                const session = await ensureSessionOwnership(client, sessionId, actor);
                if (!session) {
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

        async listSessions(actor) {
            const result =
                actor?.role === 'admin' || actor?.role === 'support'
                    ? await pool.query<SessionRow>(
                        `SELECT id, url, user_agent, started_at, last_event_at, event_count, user_id
                     FROM sessions ORDER BY started_at DESC`
                    )
                    : await pool.query<SessionRow>(
                        `SELECT id, url, user_agent, started_at, last_event_at, event_count, user_id
                     FROM sessions WHERE user_id = $1 ORDER BY started_at DESC`,
                        [actor?.id || defaultOwnerUserId || '']
                    );
            return result.rows.map(mapSessionRow);
        },

        async deleteSession(sessionId, actor) {
            const client = await pool.connect();
            try {
                const session = await ensureSessionOwnership(client, sessionId, actor);
                if (!session) {
                    return { error: 'Session not found', statusCode: 404 };
                }

                await client.query(`DELETE FROM session_events WHERE session_id = $1`, [sessionId]);
                await client.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
                return { ok: true };
            } finally {
                client.release();
            }
        },

        async listTasks(actor) {
            const result =
                actor?.role === 'admin' || actor?.role === 'support'
                    ? await pool.query<TaskRow>(
                        `SELECT id, title, description, status, created_at, updated_at, user_id
                     FROM tasks ORDER BY created_at DESC`
                    )
                    : await pool.query<TaskRow>(
                        `SELECT id, title, description, status, created_at, updated_at, user_id
                     FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
                        [actor?.id || defaultOwnerUserId || '']
                    );
            return result.rows.map(mapTaskRow);
        },

        async createTask(payload, actor) {
            const title = typeof payload.title === 'string' ? payload.title.trim() : '';
            const description =
                typeof payload.description === 'string' ? payload.description.trim() : '';
            const status: TaskStatus = payload.status === 'done' ? 'done' : 'todo';
            const ownerUserId = actor?.id || defaultOwnerUserId || '';

            if (!title) {
                return { error: 'title is required', statusCode: 400 };
            }

            const id = uuidv4();
            const now = new Date();

            pool.query(
                `INSERT INTO tasks (id, title, description, status, created_at, updated_at, user_id)
                 VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)`,
                [id, title, description, status, ownerUserId]
            );

            return {
                task: {
                    id,
                    title,
                    description,
                    status,
                    createdAt: now.getTime(),
                    updatedAt: now.getTime(),
                    userId: ownerUserId,
                },
                statusCode: 201 as const,
            };
        },

        async updateTask(id, payload, actor) {
            const client = await pool.connect();
            try {
                const task = await ensureTaskOwnership(client, id, actor);
                if (!task) {
                    return { error: 'Task not found', statusCode: 404 };
                }

                const title = typeof payload.title === 'string' ? payload.title.trim() : task.title;
                const description =
                    typeof payload.description === 'string'
                        ? payload.description.trim()
                        : task.description;
                const status: TaskStatus = payload.status === 'done' ? 'done' : 'todo';

                if (!title) {
                    return { error: 'title is required', statusCode: 400 };
                }

                await client.query(
                    `UPDATE tasks SET title = $1, description = $2, status = $3, updated_at = NOW() WHERE id = $4`,
                    [title, description, status, id]
                );

                const now = new Date();
                return {
                    task: {
                        id,
                        title,
                        description,
                        status,
                        createdAt: task.created_at.getTime(),
                        updatedAt: now.getTime(),
                        userId: task.user_id,
                    },
                };
            } finally {
                client.release();
            }
        },

        async deleteTask(id, actor) {
            const client = await pool.connect();
            try {
                const task = await ensureTaskOwnership(client, id, actor);
                if (!task) {
                    return { error: 'Task not found', statusCode: 404 };
                }

                await client.query(`DELETE FROM tasks WHERE id = $1`, [id]);
                return { ok: true };
            } finally {
                client.release();
            }
        },

        async listUsers(page = 1, limit = 20, role?: AuthRole) {
            const offset = (page - 1) * limit;
            const countResult = role
                ? await pool.query<{ count: string }>(
                    `SELECT COUNT(*) as count FROM users WHERE role = $1`,
                    [role]
                )
                : await pool.query<{ count: string }>(`SELECT COUNT(*) as count FROM users`);
            const total = parseInt(countResult.rows[0].count, 10);
            const result = role
                ? await pool.query<AuthUserRow>(
                    `SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
                    [role, limit, offset]
                )
                : await pool.query<AuthUserRow>(
                    `SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
                    [limit, offset]
                );
            return {
                users: result.rows.map(mapUserRow),
                total,
            };
        },

        async createUser(payload, actor) {
            if (actor?.role !== 'admin') {
                return { error: 'Forbidden', statusCode: 403 };
            }

            const { email, password, role } = payload;
            const normalizedEmail = normalizeEmail(email);

            const existingEmail = await pool.query(`SELECT id FROM users WHERE email = $1`, [
                normalizedEmail,
            ]);
            if (existingEmail.rows.length > 0) {
                return { error: 'Email already in use', statusCode: 409 };
            }

            if (password.length < 8) {
                return { error: 'password must be at least 8 characters', statusCode: 400 };
            }

            if (!ensureUserModifiable(role, actor)) {
                return { error: 'Cannot create this user role', statusCode: 403 };
            }

            const id = uuidv4();
            const { salt, hash } = hashPassword(password);
            const result = await pool.query<AuthUserRow>(
                `INSERT INTO users (id, email, role, password_salt, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [id, normalizedEmail, role, salt, hash]
            );

            return { user: mapUserRow(result.rows[0]) };
        },

        async updateUser(id, payload, actor) {
            if (actor?.role !== 'admin') {
                return { error: 'Forbidden', statusCode: 403 };
            }

            const result = await pool.query<AuthUserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
            const existing = result.rows[0];
            if (!existing) {
                return { error: 'User not found', statusCode: 404 };
            }

            const targetRole = payload.role || existing.role;
            if (!ensureUserModifiable(targetRole, actor)) {
                return { error: 'Cannot modify this user role', statusCode: 403 };
            }

            const email =
                typeof payload.email === 'string' ? normalizeEmail(payload.email) : existing.email;
            const role: AuthRole =
                payload.role === 'admin' || payload.role === 'support' || payload.role === 'user'
                    ? payload.role
                    : existing.role;

            if (payload.email && email !== existing.email) {
                const emailCheck = await pool.query(
                    `SELECT id FROM users WHERE email = $1 AND id != $2`,
                    [email, id]
                );
                if (emailCheck.rows.length > 0) {
                    return { error: 'Email already in use', statusCode: 409 };
                }
            }

            if (payload.password) {
                const pwd = payload.password.trim();
                if (pwd.length < 8) {
                    return { error: 'password must be at least 8 characters', statusCode: 400 };
                }
                const { salt, hash } = hashPassword(pwd);
                await pool.query(
                    `UPDATE users SET email = $1, role = $2, password_salt = $3, password_hash = $4, updated_at = NOW() WHERE id = $5`,
                    [email, role, salt, hash, id]
                );
            } else {
                await pool.query(
                    `UPDATE users SET email = $1, role = $2, updated_at = NOW() WHERE id = $3`,
                    [email, role, id]
                );
            }

            return {
                user: {
                    id,
                    email,
                    role,
                    createdAt: existing.created_at.getTime(),
                    updatedAt: Date.now(),
                },
            };
        },

        async deleteUser(id, actor) {
            if (actor?.role !== 'admin') {
                return { error: 'Forbidden', statusCode: 403 };
            }

            if (actor.id === id) {
                return { error: 'Cannot delete yourself', statusCode: 400 };
            }

            const result = await pool.query<AuthUserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
            if (!result.rows[0]) {
                return { error: 'User not found', statusCode: 404 };
            }

            if (!ensureUserModifiable(result.rows[0].role, actor)) {
                return { error: 'Cannot delete this user', statusCode: 403 };
            }

            await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
            return { ok: true };
        },

        async close() {
            await pool.end();
        },
    };
}
