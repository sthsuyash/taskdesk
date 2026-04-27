import { createServer, type Server } from 'http';
import { env } from './config/env.js';
import { createApp } from './app/createApp.js';
import { createStore } from './db/store.js';
import { createApiRouter } from './routes/apiRouter.js';
import { createLiveServer } from './live/createLiveServer.js';

const DB_INIT_MAX_RETRIES = 10;
const DB_INIT_RETRY_DELAY_MS = 1000;

async function waitForDatabase(connectionString: string, attempt = 1): Promise<boolean> {
    try {
        const store = await createStore({ connectionString });
        await store.close();
        return true;
    } catch (error) {
        if (attempt >= DB_INIT_MAX_RETRIES) {
            console.error(`\n[FATAL] Failed to connect to DB after ${DB_INIT_MAX_RETRIES} attempts`);
            return false;
        }
        const delay = DB_INIT_RETRY_DELAY_MS * attempt;
        console.log(`[DB] Connection attempt ${attempt}/${DB_INIT_MAX_RETRIES} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return waitForDatabase(connectionString, attempt + 1);
    }
}

export async function startServer() {
    console.log('[DB] Waiting for database connection...');
    const dbReady = await waitForDatabase(env.databaseUrl);
    if (!dbReady) {
        process.exit(1);
    }
    console.log('[DB] Database connected successfully');

    const store = await createStore({
        connectionString: env.databaseUrl,
        bootstrapAdmin: {
            email: env.adminSeedEmail,
            password: env.adminSeedPassword,
        },
        bootstrapSupport: {
            email: env.supportSeedEmail,
            password: env.supportSeedPassword,
        },
    });

    let broadcastToViewers: (sessionId: string, events: unknown[]) => void = () => { };
    const apiRouter = createApiRouter({
        store,
        broadcastToViewers: (sessionId, events) => broadcastToViewers(sessionId, events),
    });

    const app = createApp({
        apiRouter,
        allowedOrigins: env.allowedOrigins,
    });

    const server = createServer(app);
    const liveServer = createLiveServer({ server, store });
    broadcastToViewers = liveServer.broadcastToViewers;

    const shutdown = async () => {
        console.log('\nShutting down cleanly...');
        liveServer.close();
        await store.close();
        server.close(() => {
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    const startHttpServer = (): Promise<void> => {
        return new Promise((resolve) => {
            server.listen(env.port, () => {
                console.log(`
TaskDesk server running on http://localhost:${env.port}
Database: ${env.databaseUrl}

API:
  Tasks     -> http://localhost:${env.port}/api/tasks
  Sessions -> http://localhost:${env.port}/api/sessions
`);
                resolve();
            });
        });
    };

    const waitForServerReady = async (maxAttempts = 20, delayMs = 250): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await fetch(`http://localhost:${env.port}/api/health`, { method: 'GET' });
                if (response.ok || response.status === 404) {
                    return true;
                }
            } catch {
                // Server not ready yet
            }
            await new Promise((r) => setTimeout(r, delayMs));
        }
        return false;
    };

    await startHttpServer();
    const ready = await waitForServerReady();
    if (!ready) {
        console.warn('[WARN] Server started but health check not confirmed, proceeding anyway...');
    }

    return { server, store, liveServer };
}