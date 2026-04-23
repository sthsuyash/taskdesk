import { useEffect, useRef, useState } from 'react';
import { Replayer } from '@rrweb/replay';
import { ExternalLink, RadioTower, Wifi, WifiOff } from 'lucide-react';

interface EventWithTime {
    type: number;
    data: unknown;
    timestamp: number;
    [key: string]: unknown;
}
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@rrweb/replay/dist/style.css';
import { env } from '@/config/env';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ReplayerInstance {
    addEvent: (event: EventWithTime) => void;
    startLive: (baselineTime?: number) => void;
    play: (timeOffset?: number) => void;
    destroy?: () => void;
}

type LiveStatus = 'idle' | 'connecting' | 'live' | 'error';

const ACTIVE_SESSION_STORAGE_KEY = 'rrweb.activeSessionId';

export default function Live() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<LiveStatus>('idle');
    const [error, setError] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const replayerRef = useRef<ReplayerInstance | null>(null);
    const playerReadyRef = useRef(false);
    // Accumulate ALL incoming events across messages so that
    // initializePlayer always has the full event history to find the
    // full snapshot in, even if the snapshot arrives in a later batch.
    const bufferedEventsRef = useRef<EventWithTime[]>([]);
    const { toast } = useToast();
    const toastRef = useRef(toast);

    const selectedSessionId = searchParams.get('session') ?? window.sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) ?? '';

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    useEffect(() => {
        if (status !== 'live' || !replayerRef.current || !containerRef.current) return;

        const iframe = containerRef.current.querySelector('iframe') as HTMLIFrameElement;
        if (!iframe) return;

        const observer = new ResizeObserver(() => {
            if (!iframe.contentDocument?.documentElement) return;

            const recordedWidth = iframe.contentDocument.documentElement.scrollWidth;
            const recordedHeight = iframe.contentDocument.documentElement.scrollHeight;
            const containerWidth = containerRef.current!.clientWidth;

            const scale = Math.min(containerWidth / recordedWidth, 1);

            iframe.style.transform = `scale(${scale})`;
            iframe.style.transformOrigin = 'top left';
            iframe.style.width = `${recordedWidth}px`;
            iframe.style.height = `${recordedHeight}px`;

            containerRef.current!.style.height = `${recordedHeight * scale}px`;
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [status]);

    useEffect(() => {
        if (!selectedSessionId || !containerRef.current) {
            setStatus('idle');
            setError('');
            playerReadyRef.current = false;
            bufferedEventsRef.current = [];
            replayerRef.current?.destroy?.();
            replayerRef.current = null;
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            return;
        }

        let closedByCleanup = false;
        let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

        const socketUrl = new URL('/live', env.liveUrl);
        socketUrl.searchParams.set('session', selectedSessionId);
        socketUrl.searchParams.set('role', 'viewer');

        const socket = new WebSocket(socketUrl.toString());
        setStatus('connecting');
        setError('');
        playerReadyRef.current = false;
        // reset accumulated buffer when starting a new session
        bufferedEventsRef.current = [];

        replayerRef.current?.destroy?.();
        replayerRef.current = null;
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        const initializePlayer = (events: EventWithTime[]) => {
            if (!containerRef.current || replayerRef.current || events.length === 0) {
                return;
            }

            try {
                const hasFullSnapshot = events.some((eventItem) => eventItem.type === 2);
                if (!hasFullSnapshot) {
                    console.warn('[Live] Waiting for full snapshot event, buffered:', events.length);
                    return;
                }

                const replayer = new Replayer(events, {
                    root: containerRef.current,
                    liveMode: true,
                    showWarning: false,
                    UNSAFE_replayCanvas: true,
                    mouseTail: {
                        duration: 500,
                        lineCap: 'round',
                        lineWidth: 2,
                        strokeStyle: 'red',
                    },
                }) as unknown as ReplayerInstance;

                replayerRef.current = replayer;

                replayer.startLive(Date.now());

                if (replayer.play) {
                    replayer.play();
                }

                playerReadyRef.current = true;
                setStatus('live');

                console.log('[Live] Player initialized with', events.length, 'buffered events');

                setTimeout(() => {
                    const iframe = containerRef.current?.querySelector('iframe') as HTMLIFrameElement;
                    if (iframe?.contentDocument?.documentElement) {
                        const recordedWidth = iframe.contentDocument.documentElement.scrollWidth;
                        const containerWidth = containerRef.current!.clientWidth - 16;

                        if (recordedWidth > containerWidth) {
                            const scale = containerWidth / recordedWidth;
                            iframe.style.transform = `scale(${scale})`;
                            iframe.style.transformOrigin = 'top left';
                            iframe.style.width = `${recordedWidth}px`;
                        }
                    }
                }, 100);
            } catch (err) {
                console.error('[Live] Player initialization error:', err);
                setError(`Player initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                setStatus('error');
            }
        };

        connectionTimeout = setTimeout(() => {
            if (!playerReadyRef.current && !closedByCleanup) {
                setError('No events received from the recording session. Make sure the recorder is actively sending events.');
                setStatus('error');
            }
        }, 10000);

        socket.onopen = () => {
            if (!closedByCleanup) {
                setStatus('connecting');
            }
        };

        socket.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data as string) as {
                    type?: 'catchup' | 'events';
                    events?: unknown[];
                };

                if (!payload.events || !Array.isArray(payload.events) || payload.events.length === 0) {
                    if (connectionTimeout) {
                        clearTimeout(connectionTimeout);
                        connectionTimeout = null;
                    }
                    setStatus('connecting');
                    return;
                }

                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }

                const incomingEvents = payload.events as EventWithTime[];

                if (!playerReadyRef.current) {
                    // Accumulate events across ALL messages until we have a full snapshot.
                    // Without this, if the snapshot wasn't in the very first batch,
                    // each subsequent call to initializePlayer only sees that batch's events
                    // and bails — the player never starts.
                    bufferedEventsRef.current.push(...incomingEvents);
                    initializePlayer(bufferedEventsRef.current);
                    return;
                }

                incomingEvents.forEach((incomingEvent) => {
                    try {
                        if (replayerRef.current?.addEvent) {
                            replayerRef.current.addEvent(incomingEvent);
                        }
                    } catch {
                        // Ignore malformed events and continue streaming others.
                    }
                });
            } catch (err) {
                console.error('[Live] Error processing message:', err);
            }
        };

        socket.onerror = () => {
            if (!closedByCleanup) {
                setStatus('error');
                setError('Failed to connect to the live session stream');
                toastRef.current({
                    title: 'Live view failed',
                    description: 'The viewer connection could not be established.',
                    variant: 'destructive',
                });
            }
        };

        socket.onclose = (event) => {
            if (!closedByCleanup) {
                setStatus('error');
                setError(`The live stream closed unexpectedly (code: ${event.code})`);
            }
        };

        return () => {
            closedByCleanup = true;
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
            }
            if (socket.readyState === WebSocket.OPEN) {
                socket.close(1000, 'cleanup');
            }
            playerReadyRef.current = false;
            bufferedEventsRef.current = [];
            replayerRef.current?.destroy?.();
            replayerRef.current = null;
        };
    }, [selectedSessionId]);


    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-tight">Live co-browsing</h2>
                <p className="text-sm text-muted-foreground">Watch the current recording session in real-time.</p>
            </section>

            <section className="px-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <RadioTower className="h-5 w-5 text-primary" />
                                    Live Stream
                                </CardTitle>
                                <CardDescription>
                                    {selectedSessionId ? `Session: ${selectedSessionId.slice(0, 8)}...` : 'Waiting for session'}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={status === 'live' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
                                    {status === 'live' && <Wifi className="mr-1 h-3 w-3" />}
                                    {status === 'error' && <WifiOff className="mr-1 h-3 w-3" />}
                                    {status}
                                </Badge>
                                <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {!selectedSessionId && <p className="text-sm text-muted-foreground">No active live session available yet</p>}
                        {status === 'connecting' && <p className="text-sm text-muted-foreground">Connecting to live session...</p>}
                        <div
                            className="w-full overflow-auto rounded-lg border border-dashed border-border bg-background p-1"
                            ref={containerRef}
                            style={{
                                minHeight: '600px',
                                display: 'block',
                                position: 'relative',
                            }}
                        />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
