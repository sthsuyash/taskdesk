import { createApp } from '@/app';
import { env } from '@/config/env';
import { Container } from '@/container';
import { seedBootstrapUsers } from '@/infrastructure/db/seed';
import { createLiveServer } from '@/infrastructure/live/LiveServer';
import { prisma } from '@/lib/prisma';
import { createApiRouter } from '@/routes/api';
import { createServer } from 'http';

const DB_INIT_MAX_RETRIES = 10;
const DB_INIT_RETRY_DELAY_MS = 1000;

async function waitForDatabase(attempt = 1): Promise<boolean> {
    try {
        await prisma.$connect();
        return true;
    } catch (error) {
        if (attempt >= DB_INIT_MAX_RETRIES) {
            console.error(
                `\n[FATAL] Failed to connect to DB after ${DB_INIT_MAX_RETRIES} attempts`
            );
            return false;
        }
        const delay = DB_INIT_RETRY_DELAY_MS * attempt;
        console.log(
            `[DB] Connection attempt ${attempt}/${DB_INIT_MAX_RETRIES} failed, retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return waitForDatabase(attempt + 1);
    }
}

export async function startServer() {
    console.log('[DB] Waiting for database connection...');
    const dbReady = await waitForDatabase();
    if (!dbReady) {
        process.exit(1);
    }
    console.log('[DB] Database connected successfully');

    const bootstrapConfig = {
        bootstrapAdmin: {
            email: env.adminSeedEmail,
            password: env.adminSeedPassword,
        },
        bootstrapSupport: {
            email: env.supportSeedEmail,
            password: env.supportSeedPassword,
        },
    };

    await seedBootstrapUsers(prisma, bootstrapConfig);

    const container = new Container(prisma);
    const apiRouter = createApiRouter(container);

    const app = createApp({
        container,
        apiRouter,
        allowedOrigins: env.allowedOrigins,
    });

    const server = createServer(app);
    const liveServer = createLiveServer({
        server,
        authService: container.authService,
        sessionService: container.sessionService,
    });

    container.setBroadcast(liveServer.broadcastToViewers);

    const shutdown = async () => {
        console.log('\nShutting down cleanly...');
        liveServer.close();
        await prisma.$disconnect();
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
Database: connected

API:
  Tasks     -> http://localhost:${env.port}/api/tasks
  Sessions  -> http://localhost:${env.port}/api/sessions
`);
                resolve();
            });
        });
    };

    await startHttpServer();
    return { server, container, liveServer };
}
