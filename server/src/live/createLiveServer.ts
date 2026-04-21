import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import type { Server } from 'http';
import type { Store } from '../db/store.js';

interface LiveServerDependencies {
    server: Server;
    store: Store;
}

export function createLiveServer({ server, store }: LiveServerDependencies) {
    const rooms = new Map<string, Set<WebSocket>>();
    const viewerBootstrapState = new Map<WebSocket, { ready: boolean; bufferedEvents: unknown[] }>();

    function broadcastToViewers(sessionId: string, events: unknown[]) {
        const viewers = rooms.get(sessionId);
        if (!viewers || viewers.size === 0) {
            return;
        }

        viewers.forEach((ws) => {
            if (ws.readyState !== 1) {
                return;
            }

            const bootstrap = viewerBootstrapState.get(ws);
            if (bootstrap && !bootstrap.ready) {
                bootstrap.bufferedEvents.push(...events);
                return;
            }

            const payload = JSON.stringify({ type: 'events', events });
            if (ws.readyState === 1) {
                ws.send(payload);
            }
        });
    }

    const wss = new WebSocketServer({ server, path: '/live' });

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '/', 'ws://localhost');
        const sessionId = url.searchParams.get('session');
        const role = url.searchParams.get('role') || 'viewer';

        if (!sessionId) {
            ws.close(1008, 'Missing session param');
            return;
        }

        if (role === 'viewer') {
            if (!rooms.has(sessionId)) {
                rooms.set(sessionId, new Set());
            }
            rooms.get(sessionId)?.add(ws);
            viewerBootstrapState.set(ws, { ready: false, bufferedEvents: [] });

            store.getSessionEvents(sessionId).then(events => {
                if (ws.readyState !== 1) {
                    return;
                }

                const bootstrap = viewerBootstrapState.get(ws);
                const beforeConnectEvents = events || [];
                const bootstrapBuffered = bootstrap?.bufferedEvents ?? [];

                const dedupeSet = new Set<string>();
                const catchupEvents = [...beforeConnectEvents, ...bootstrapBuffered].filter((event) => {
                    const key = JSON.stringify(event);
                    if (dedupeSet.has(key)) {
                        return false;
                    }
                    dedupeSet.add(key);
                    return true;
                });

                ws.send(JSON.stringify({ type: 'catchup', events: catchupEvents }));

                if (bootstrap) {
                    bootstrap.ready = true;
                    bootstrap.bufferedEvents = [];
                }
            });

            ws.on('close', () => {
                rooms.get(sessionId)?.delete(ws);
                viewerBootstrapState.delete(ws);
            });
        }

        if (role === 'recorder') {
            ws.on('message', async (data: RawData) => {
                try {
                    const parsed = JSON.parse(data.toString()) as { events?: unknown[] };
                    const { events } = parsed;
                    if (!Array.isArray(events) || events.length === 0) {
                        return;
                    }

                    await store.appendEvents(sessionId, events);
                    broadcastToViewers(sessionId, events);
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown websocket parse error';
                    console.error('WS parse error:', message);
                }
            });
        }
    });

    return {
        broadcastToViewers,
        close() {
            wss.close();
        },
    };
}
