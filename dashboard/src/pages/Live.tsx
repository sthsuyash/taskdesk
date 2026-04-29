import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { env } from '@/config/env';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Replayer } from '@rrweb/replay';
import '@rrweb/replay/dist/style.css';
import { Clock3, ExternalLink, List, PlayCircle, RadioTower, User, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface EventWithTime {
    type: number;
    data: unknown;
    timestamp: number;
    [key: string]: unknown;
}

interface EventDescriptor {
    label: string;
    detail?: string;
}

interface ReplayerInstance {
    addEvent: (event: EventWithTime) => void;
    startLive: (baselineTime?: number) => void;
    play: (timeOffset?: number) => void;
    goto: (timeOffset: number, play?: boolean) => void;
    destroy?: () => void;
}

type LiveStatus = 'idle' | 'connecting' | 'live' | 'error';

const ACTIVE_SESSION_STORAGE_KEY = 'taskdesk.activeSessionId';

function formatUrlDisplay(url: string) {
    try {
        const parsed = new URL(url);
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        return path || '/';
    } catch {
        return url;
    }
}

function extractStringUrl(candidate: unknown): string | undefined {
    if (typeof candidate === 'string') {
        return candidate;
    }

    if (!candidate || typeof candidate !== 'object') {
        return undefined;
    }

    const record = candidate as Record<string, unknown>;

    for (const key of ['href', 'url', 'pathname']) {
        const value = record[key];
        if (typeof value === 'string' && value.length > 0) {
            return value;
        }
    }

    if (record.location) {
        return extractStringUrl(record.location);
    }

    if (record.payload) {
        return extractStringUrl(record.payload);
    }

    if (record.data) {
        return extractStringUrl(record.data);
    }

    return undefined;
}

function extractEventUrl(event: EventWithTime) {
    return extractStringUrl(event.data);
}

function describeEvent(event: EventWithTime): EventDescriptor {
    const eventUrl = extractEventUrl(event);

    if (event.type === 3) {
        const incremental = event.data as
            | {
                  source?: number;
                  x?: number;
                  y?: number;
                  type?: number;
                  text?: string;
              }
            | undefined;

        switch (incremental?.source) {
            case 0:
                return { label: 'DOM Mutation' };
            case 1:
                return { label: 'Mouse Move' };
            case 2: {
                const interactionType = incremental?.type;
                if (interactionType === 2) {
                    return {
                        label: 'Click',
                        detail:
                            typeof incremental.x === 'number' && typeof incremental.y === 'number'
                                ? `at (${incremental.x}, ${incremental.y})`
                                : undefined,
                    };
                }
                if (interactionType === 1) {
                    return { label: 'Mouse Down' };
                }
                if (interactionType === 0) {
                    return { label: 'Mouse Up' };
                }
                return { label: 'Mouse Interaction' };
            }
            case 3:
                return { label: 'Scroll' };
            case 4:
                return { label: 'Viewport Resize' };
            case 5:
                return {
                    label: 'Input',
                    detail:
                        typeof incremental.text === 'string' && incremental.text.length > 0
                            ? `"${incremental.text.slice(0, 40)}${incremental.text.length > 40 ? '...' : ''}"`
                            : undefined,
                };
            case 7:
                return { label: 'Media Interaction' };
            case 8:
                return { label: 'Stylesheet Rule' };
            case 9:
                return { label: 'Canvas Mutation' };
            case 10:
                return { label: 'Font' };
            case 11:
                return { label: 'Log' };
            case 12:
                return { label: 'Drag' };
            case 13:
                return { label: 'Style Declaration' };
            case 14:
                return { label: 'Selection' };
            case 15:
                return { label: 'Adopted Stylesheet' };
            case 16:
                return { label: 'Custom Element' };
            default:
                return eventUrl
                    ? { label: 'Navigation', detail: formatUrlDisplay(eventUrl) }
                    : { label: 'Incremental' };
        }
    }

    if (event.type === 5) {
        const custom = event.data as
            | { tag?: string; payload?: { title?: string; status?: string; taskId?: string } }
            | undefined;
        const tag = custom?.tag || 'custom-event';

        switch (tag) {
            case 'task-created':
                return { label: 'Task Created', detail: custom?.payload?.title };
            case 'task-updated':
                return { label: 'Task Updated', detail: `${custom?.payload?.status}` };
            case 'task-deleted':
                return { label: 'Task Deleted', detail: custom?.payload?.taskId };
            default:
                return { label: 'Custom', detail: tag };
        }
    }

    if (event.type === 4) {
        return {
            label: eventUrl ? 'Page Load' : 'Full Snapshot',
            detail: eventUrl ? formatUrlDisplay(eventUrl) : undefined,
        };
    }

    if (event.type === 2) {
        return eventUrl
            ? { label: 'Navigation', detail: formatUrlDisplay(eventUrl) }
            : { label: 'Incremental Snapshot' };
    }

    return { label: `Type ${event.type}` };
}

export default function Live() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<LiveStatus>('idle');
    const [error, setError] = useState('');
    const [liveEvents, setLiveEvents] = useState<EventWithTime[]>([]);
    const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const replayerRef = useRef<ReplayerInstance | null>(null);
    const playerReadyRef = useRef(false);
    const bufferedEventsRef = useRef<EventWithTime[]>([]);
    const { toast } = useToast();
    const toastRef = useRef(toast);

    const selectedSessionId =
        searchParams.get('session') ??
        window.sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) ??
        '';

    const eventRows = useMemo(
        () =>
            liveEvents.map((event, index) => ({
                id: `${event.timestamp}-${index}`,
                event,
                index,
                timeLabel: new Date(event.timestamp).toLocaleTimeString(),
                ...describeEvent(event),
            })),
        [liveEvents]
    );

    const visibleEventRows = useMemo(() => eventRows.slice(-200), [eventRows]);

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

    const seekToTimestamp = (targetTimestamp: number) => {
        const player = replayerRef.current;
        if (!player?.goto || !sessionStartTime) {
            return;
        }

        const offset = targetTimestamp - sessionStartTime;
        player.goto(offset, false);
    };

    useEffect(() => {
        if (!selectedSessionId || !containerRef.current) {
            setStatus('idle');
            setError('');
            setLiveEvents([]);
            setSessionStartTime(null);
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
        setLiveEvents([]);
        setSessionStartTime(null);
        playerReadyRef.current = false;
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
                    console.warn(
                        '[Live] Waiting for full snapshot event, buffered:',
                        events.length
                    );
                    return;
                }

                const startTime = events[0]?.timestamp || Date.now();
                setSessionStartTime(startTime);

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
                    const iframe = containerRef.current?.querySelector(
                        'iframe'
                    ) as HTMLIFrameElement;
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
                setError(
                    `Player initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`
                );
                setStatus('error');
            }
        };

        connectionTimeout = setTimeout(() => {
            if (!playerReadyRef.current && !closedByCleanup) {
                setError(
                    'No events received from the recording session. Make sure the recorder is actively sending events.'
                );
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

                if (
                    !payload.events ||
                    !Array.isArray(payload.events) ||
                    payload.events.length === 0
                ) {
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
                    bufferedEventsRef.current.push(...incomingEvents);
                    setLiveEvents((prev) => [...prev, ...incomingEvents]);
                    initializePlayer(bufferedEventsRef.current);
                    return;
                }

                setLiveEvents((prev) => [...prev, ...incomingEvents]);

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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <Badge variant="secondary" className="w-fit">
                            Live co-browsing
                        </Badge>
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">
                                Watch live session with events
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                View the replay on the left and inspect events in the panel on the
                                right.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Badge
                            variant={
                                status === 'live'
                                    ? 'default'
                                    : status === 'error'
                                      ? 'destructive'
                                      : 'secondary'
                            }
                        >
                            {status === 'live' && <Wifi className="mr-1 h-3 w-3" />}
                            {status === 'error' && <WifiOff className="mr-1 h-3 w-3" />}
                            {status}
                        </Badge>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/dashboard')}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_325px] xl:grid-cols-[1fr]">
                <Card className="overflow-hidden">
                    <CardHeader className="space-y-3 border-b bg-muted/30">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <PlayCircle className="h-5 w-5 text-primary" />
                                    Live Stream
                                </CardTitle>
                                <CardDescription>
                                    {selectedSessionId
                                        ? `${selectedSessionId.slice(0, 8)}... · ${liveEvents.length} events`
                                        : 'Waiting for session'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {!selectedSessionId && (
                            <p className="text-sm text-muted-foreground">
                                No active live session available yet.
                            </p>
                        )}
                        {status === 'connecting' && (
                            <p className="text-sm text-muted-foreground">
                                Connecting to live session...
                            </p>
                        )}
                        <div
                            className="w-full rounded-lg border border-dashed border-border bg-background"
                            ref={containerRef}
                            style={{
                                minHeight: '400px',
                                display: 'block',
                                position: 'relative',
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="space-y-0 border-b bg-muted/30 p-0">
                        <div className="grid grid-cols-1">
                            <button
                                type="button"
                                className="flex items-center justify-center gap-2 border-b-2 border-primary bg-background px-3 py-4 text-sm font-medium text-foreground"
                            >
                                <List className="h-4 w-4" />
                                Events
                            </button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Events</span>
                                <span>{eventRows.length} total</span>
                            </div>

                            {visibleEventRows.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No events loaded yet.
                                </p>
                            ) : (
                                <div className="max-h-[640px] overflow-auto pr-1 space-y-2">
                                    {visibleEventRows.map((row) => {
                                        const isSelected = selectedEventIndex === row.index;

                                        return (
                                            <button
                                                key={row.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedEventIndex(row.index);
                                                    seekToTimestamp(row.event.timestamp);
                                                }}
                                                className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'bg-background hover:bg-accent/40'}`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[10px]"
                                                            >
                                                                {row.label}
                                                            </Badge>
                                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                                #{row.index + 1}
                                                            </span>
                                                        </div>
                                                        {row.detail && (
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {row.detail}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right text-[10px] text-muted-foreground">
                                                        <p>{row.timeLabel}</p>
                                                        {row.event.type === 4 && (
                                                            <p className="mt-1 flex items-center justify-end gap-1 text-primary">
                                                                <ExternalLink className="h-3 w-3" />
                                                                page load
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}