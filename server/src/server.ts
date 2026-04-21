import { createServer, type Server } from 'http';
import { env } from './config/env.js';
import { createApp } from './app/createApp.js';
import { createStore } from './db/store.js';
import { createApiRouter } from './routes/apiRouter.js';
import { createLiveServer } from './live/createLiveServer.js';

export async function startServer() {
    const store = await createStore({ connectionString: env.databaseUrl });

    let broadcastToViewers: (sessionId: string, events: unknown[]) => void = () => { };
    const apiRouter = createApiRouter({
        store,
        broadcastToViewers: (sessionId, events) => broadcastToViewers(sessionId, events),
    });

    const app = createApp({
        jsonLimit: env.jsonLimit,
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

    server.listen(env.port, () => {
        console.log(`
rrweb server running on http://localhost:${env.port}
Database: ${env.databaseUrl}

API:
  Tasks     -> http://localhost:${env.port}/api/tasks
  Sessions -> http://localhost:${env.port}/api/sessions
`);
    });

    return { server, store, liveServer };
}