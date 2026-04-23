import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { record } from '@rrweb/record';
import { createSession, postSessionEvents } from '../services/sessionsApi';
import type { RecorderState } from '../types';
import { env } from '@/config/env';

const FLUSH_INTERVAL_MS = 500;
const SOCKET_OPEN_TIMEOUT_MS = 5000;
const RECONNECT_BASE_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const ACTIVE_SESSION_STORAGE_KEY = 'rrweb.activeSessionId';

type RrwebRecordApi = typeof record & {
    addCustomEvent?: (tag: string, payload: unknown) => void;
};

export function useSessionRecorder() {
    const location = useLocation();
    const [sessionId, setSessionId] = useState('');
    const [recordingState, setRecordingState] = useState<RecorderState>('initializing');
    const pendingEventsRef = useRef<unknown[]>([]);
    const sessionIdRef = useRef('');
    const creatingSessionRef = useRef<Promise<string | null> | null>(null);
    const liveSocketRef = useRef<WebSocket | null>(null);
    const closingSocketsRef = useRef(new Set<WebSocket>());
    const isFlushingViaApiRef = useRef(false);
    const reconnectAttemptsRef = useRef(0);
    const isUnmountedRef = useRef(false);
    const isCleanupRef = useRef(false);
    // Track whether rrweb record() is active before allowing custom events
    const isRecordingRef = useRef(false);

    const emitCustomEvent = useCallback((tag: string, payload: unknown) => {
        if (!isRecordingRef.current) {
            console.warn('[Recorder] Cannot emit custom event — recording not yet active');
            return;
        }
        try {
            (record as RrwebRecordApi).addCustomEvent?.(tag, payload);
        } catch (error) {
            console.warn('[Recorder] Failed to add custom event:', error);
        }
    }, []);

    const connectLiveSocket = useCallback((sid: string): Promise<void> => {
        if (liveSocketRef.current?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        if (liveSocketRef.current?.readyState === WebSocket.CONNECTING) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const socketUrl = new URL('/live', env.liveUrl);
            socketUrl.searchParams.set('session', sid);
            socketUrl.searchParams.set('role', 'recorder');

            console.log('[Recorder] Connecting to live WebSocket:', socketUrl.toString());

            const socket = new WebSocket(socketUrl.toString());
            let settled = false;
            const isCleanupSocket = () => closingSocketsRef.current.has(socket);
            const isActiveSocket = () => liveSocketRef.current === socket;

            const openTimeoutId = window.setTimeout(() => {
                if (settled) {
                    return;
                }

                settled = true;
                console.error('[Recorder] Live WebSocket open timeout');
                socket.close();

                reject(new Error('Live WebSocket open timeout'));
            }, SOCKET_OPEN_TIMEOUT_MS);

            socket.onopen = () => {
                window.clearTimeout(openTimeoutId);
                closingSocketsRef.current.delete(socket);
                reconnectAttemptsRef.current = 0;
                console.log('[Recorder] Live WebSocket connected');
                // onopen is the canonical flush point for events buffered during CONNECTING.
                // pendingEventsRef still holds those events because flushToLiveSocket bails early
                // (without splicing) when the socket is not yet OPEN.
                if (pendingEventsRef.current.length > 0) {
                    const batch = pendingEventsRef.current.splice(0, pendingEventsRef.current.length);
                    socket.send(JSON.stringify({ events: batch }));
                }

                if (!settled) {
                    settled = true;
                    resolve();
                }
            };

            socket.onerror = (error) => {
                console.error('[Recorder] Live WebSocket error:', error);
            };

            socket.onclose = (event) => {
                window.clearTimeout(openTimeoutId);
                const closedByCleanup = isCleanupSocket();
                closingSocketsRef.current.delete(socket);
                console.log('[Recorder] Live WebSocket closed:', event.code, event.reason);

                if (liveSocketRef.current === socket) {
                    liveSocketRef.current = null;
                }

                if (!settled) {
                    settled = true;
                    reject(new Error(`Live WebSocket closed before opening (${event.code})`));
                }

                if (closedByCleanup || isUnmountedRef.current || isCleanupRef.current || !sessionIdRef.current) {
                    return;
                }

                if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    console.error('[Recorder] Reconnect attempts exhausted. Recorder transport unavailable.');
                    return;
                }

                reconnectAttemptsRef.current += 1;
                const attempt = reconnectAttemptsRef.current;
                const delay = RECONNECT_BASE_DELAY_MS * attempt;

                console.warn(`[Recorder] Reconnecting to live WebSocket (attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
                window.setTimeout(() => {
                    if (isUnmountedRef.current || isCleanupRef.current || !sessionIdRef.current) {
                        return;
                    }

                    void connectLiveSocket(sessionIdRef.current).catch((error) => {
                        console.error('[Recorder] Reconnect attempt failed:', error);
                    });
                }, delay);
            };

            liveSocketRef.current = socket;
        });
    }, []);

    useEffect(() => {
        if (location.pathname !== '/') {
            setSessionId('');
            setRecordingState('initializing');
            return;
        }

        let isUnmounted = false;
        let stopRecording: (() => void) | null = null;
        let intervalId: number | null = null;

        isUnmountedRef.current = false;
        isCleanupRef.current = false;
        reconnectAttemptsRef.current = 0;

        const syncActiveSession = (id: string) => {
            if (id) {
                window.sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, id);
                return;
            }
            window.sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        };

        const ensureSession = async (): Promise<string | null> => {
            if (isCleanupRef.current || isUnmountedRef.current) {
                return null;
            }

            if (sessionIdRef.current) {
                return sessionIdRef.current;
            }

            if (creatingSessionRef.current) {
                return creatingSessionRef.current;
            }

            const createPromise = (async () => {
                if (isCleanupRef.current || isUnmountedRef.current) {
                    return null;
                }
                try {
                    const { sessionId: id } = await createSession();
                    sessionIdRef.current = id;
                    setSessionId(id);
                    syncActiveSession(id);
                    try {
                        await connectLiveSocket(id);
                    } catch (error) {
                        console.warn('[Recorder] Live socket unavailable, REST fallback will be used:', error);
                    }
                    return id;
                } catch (error) {
                    console.error('[Recorder] Session initialization failed:', error);
                    if (!isUnmounted) {
                        setRecordingState('error');
                    }
                    return null;
                } finally {
                    creatingSessionRef.current = null;
                }
            })();

            creatingSessionRef.current = createPromise;
            return createPromise;
        };

        // flushToLiveSocket is defined INSIDE useEffect so it closes over
        // the real `ensureSession` function — not a stale ref from mount time.
        const flushToLiveSocket = async (allowCreateSession = true) => {
            if (pendingEventsRef.current.length === 0) {
                return;
            }

            const sid = sessionIdRef.current || (allowCreateSession ? await ensureSession() : null);
            if (!sid) {
                return;
            }

            // Only splice events when the socket is confirmed OPEN.
            // If the socket is still CONNECTING, leave events in pendingEventsRef so
            // the `onopen` handler can flush them. This prevents the full snapshot
            // (and all early incremental events) from being silently discarded.
            if (!liveSocketRef.current || liveSocketRef.current.readyState !== WebSocket.OPEN) {
                if (isFlushingViaApiRef.current) {
                    return;
                }

                const batch = pendingEventsRef.current.splice(0, pendingEventsRef.current.length);
                if (batch.length === 0) {
                    return;
                }

                isFlushingViaApiRef.current = true;
                try {
                    await postSessionEvents(sid, batch);
                } catch (error) {
                    // Put events back at the front so retries preserve order.
                    pendingEventsRef.current = [...batch, ...pendingEventsRef.current];
                    console.error('[Recorder] Failed to flush events via REST fallback:', error);
                    if (!isUnmountedRef.current && !isCleanupRef.current) {
                        setRecordingState('error');
                    }
                } finally {
                    isFlushingViaApiRef.current = false;
                }
                return;
            }

            const batch = pendingEventsRef.current.splice(0, pendingEventsRef.current.length);
            liveSocketRef.current.send(JSON.stringify({ events: batch }));
        };

        const flush = async (allowCreateSession = true) => {
            if (isCleanupRef.current || isUnmountedRef.current) {
                return;
            }
            await flushToLiveSocket(allowCreateSession);
        };

        const init = async () => {
            if (location.pathname !== '/') {
                return;
            }

            const startTime = performance.now();
            try {
                const sid = await ensureSession();
                if (!sid) {
                    setRecordingState('error');
                    return;
                }

                setRecordingState('recording');

                try {
                    stopRecording = record({
                        emit(event) {
                            pendingEventsRef.current.push(event);
                            void flush();
                        },
                        checkoutEveryNms: 10 * 1000,
                        recordCanvas: true,
                        collectFonts: true,
                        inlineStylesheet: true,
                        maskInputOptions: {
                            password: true,
                            tel: true,
                        },
                        sampling: {
                            mousemove: 50,
                            mouseInteraction: true,
                            scroll: 120,
                            input: 'last',
                        },
                    });
                    isRecordingRef.current = true;
                } catch (error) {
                    console.error('[Recorder] Failed to initialize rrweb record:', error);
                    if (stopRecording) {
                        stopRecording();
                    }
                    if (!isUnmounted) {
                        setRecordingState('error');
                    }
                    return;
                }

                intervalId = window.setInterval(() => {
                    void flush();
                }, FLUSH_INTERVAL_MS);

                console.log('[Recorder] Recording started successfully');
            } catch (error) {
                console.error('[Recorder] Initialization failed:', error);
                if (!isUnmounted) {
                    setRecordingState('error');
                }
            }
        };

        const handleBeforeUnload = () => {
            void flush(false);
        };

        void init();
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            isUnmounted = true;
            isUnmountedRef.current = true;
            isCleanupRef.current = true;
            isRecordingRef.current = false;
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (intervalId) {
                window.clearInterval(intervalId);
            }
            if (stopRecording) {
                stopRecording();
            }
            if (liveSocketRef.current) {
                closingSocketsRef.current.add(liveSocketRef.current);
                liveSocketRef.current.close();
                liveSocketRef.current = null;
            }
            sessionIdRef.current = '';
            setSessionId('');
            window.sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
            void flush(false);
        };
    }, [connectLiveSocket, location]);

    return {
        sessionId,
        recordingState,
        emitCustomEvent,
    };
}
