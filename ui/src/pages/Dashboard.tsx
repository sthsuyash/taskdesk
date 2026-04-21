import { useEffect, useRef, useState } from 'react';
import rrwebPlayer from 'rrweb-player';
import { Clock3, MousePointerClick, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSessionEvents, listSessions } from '../services/sessionsApi';
import type { SessionSummary } from '../types';
import 'rrweb-player/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface RrwebPlayerInstance {
    $destroy?: () => void;
}

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

export default function Dashboard() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sessionEvents, setSessionEvents] = useState<EventWithTime[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<RrwebPlayerInstance | null>(null);
    const { toast } = useToast();

    const describeEvent = (event: EventWithTime): EventDescriptor => {
        if (event.type === 3) {
            const incremental = event.data as {
                source?: number;
                x?: number;
                y?: number;
                type?: number;
                text?: string;
            } | undefined;

            switch (incremental?.source) {
                case 0:
                    return { label: 'DOM Mutation' };
                case 1:
                    return { label: 'Mouse Move' };
                case 2: {
                    const interactionType = incremental?.type;
                    if (interactionType === 2) {
                        return { label: 'Click', detail: typeof incremental.x === 'number' && typeof incremental.y === 'number' ? `at (${incremental.x}, ${incremental.y})` : undefined };
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
                        detail: typeof incremental.text === 'string' && incremental.text.length > 0
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
                    return { label: 'Incremental' };
            }
        }

        if (event.type === 5) {
            const custom = event.data as { tag?: string; payload?: { title?: string; status?: string; taskId?: string } } | undefined;
            const tag = custom?.tag || 'custom-event';

            switch (tag) {
                case 'task-created':
                    return { label: 'Task Created', detail: custom?.payload?.title };
                case 'task-updated':
                    return { label: 'Task Updated', detail: custom?.payload?.title };
                case 'task-status-changed':
                    return { label: 'Task Status Changed', detail: custom?.payload?.status };
                case 'task-deleted':
                    return { label: 'Task Deleted', detail: custom?.payload?.title };
                default:
                    return { label: 'Custom Event', detail: tag };
            }
        }

        switch (event.type) {
            case 0:
                return { label: 'DOMContentLoaded' };
            case 1:
                return { label: 'Page Load' };
            case 2:
                return { label: 'Full Snapshot' };
            case 4:
                return { label: 'Meta' };
            case 6:
                return { label: 'Plugin Event' };
            default:
                return { label: `Type ${event.type}` };
        }
    };

    const isLiveSession = (session: SessionSummary) => {
        const liveWindowMs = 15000;
        return Date.now() - session.lastEventAt <= liveWindowMs;
    };

    useEffect(() => {
        const loadSessions = async () => {
            try {
                const data = await listSessions();
                setSessions(data.sessions || []);
            } catch (err) {
                console.error('Failed to load sessions:', err);
            }
        };

        void loadSessions();
        const intervalId = window.setInterval(loadSessions, 5000);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const render = async () => {
            if (!selectedSessionId || !containerRef.current) {
                setSessionEvents([]);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const { events } = await getSessionEvents(selectedSessionId);

                if (!events || events.length === 0) {
                    toast({
                        title: 'No events',
                        description: 'This session has no recorded events yet.',
                        variant: 'destructive',
                    });
                    setLoading(false);
                    return;
                }

                // FIX #4: Destroy the existing player AND clear the DOM before mounting
                // the new player. Without the innerHTML clear here, the previous player's
                // DOM nodes linger in containerRef even after $destroy(), causing the new
                // rrweb-player to mount into a dirty container and potentially crash or
                // render stale content.
                if (playerRef.current?.$destroy) {
                    playerRef.current.$destroy();
                    playerRef.current = null;
                }
                containerRef.current.innerHTML = '';

                setSessionEvents(events as EventWithTime[]);
                playerRef.current = new rrwebPlayer({
                    target: containerRef.current,
                    props: { events: events as EventWithTime[] },
                }) as RrwebPlayerInstance;
            } catch (err) {
                setError('Failed to load replay');
                setSessionEvents([]);
                const message = err instanceof Error ? err.message : 'Failed to load replay';
                toast({
                    title: 'Replay failed',
                    description: message,
                    variant: 'destructive',
                });
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        void render();

        return () => {
            // FIX #4: Also clear the DOM in cleanup so a subsequent render doesn't
            // find leftover nodes from the destroyed player instance.
            if (playerRef.current?.$destroy) {
                playerRef.current.$destroy();
                playerRef.current = null;
            }
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [selectedSessionId, toast]);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-tight">Session Dashboard</h2>
                <p className="text-sm text-muted-foreground">Browse captured sessions and replay user journeys.</p>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Sessions ({sessions.length})</CardTitle>
                        <CardDescription>Auto-refreshes every 5 seconds.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No sessions recorded yet</p>
                        ) : (
                            <ul className="space-y-2">
                                {sessions.map((session) => (
                                    <li
                                        key={session.id}
                                        className={`cursor-pointer rounded-lg border bg-background p-3 transition-colors hover:bg-accent/40 ${selectedSessionId === session.id ? 'border-primary bg-accent/50' : ''
                                            }`}
                                        onClick={() => setSelectedSessionId(session.id)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-mono text-sm font-semibold">{session.id.slice(0, 8)}</p>
                                            <Badge variant="outline" className="text-[10px]">
                                                <MousePointerClick className="mr-1 h-3 w-3" />
                                                {session.eventCount}
                                            </Badge>
                                        </div>
                                        <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                            <p className="flex items-center gap-1">
                                                <Clock3 className="h-3 w-3" />
                                                {formatDate(session.startedAt)}
                                            </p>
                                            <p className="truncate">{session.url}</p>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="text-xs font-medium text-primary transition-colors hover:underline"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelectedSessionId(session.id);
                                                }}
                                            >
                                                Open replay
                                            </button>
                                            {isLiveSession(session) && (
                                                <button
                                                    type="button"
                                                    className="text-xs font-medium text-primary transition-colors hover:underline"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        navigate(`/live?session=${session.id}`);
                                                    }}
                                                >
                                                    Watch live
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlayCircle className="h-5 w-5 text-primary" />
                            Replay
                        </CardTitle>
                        <CardDescription>
                            {selectedSessionId ? `Selected: ${selectedSessionId.slice(0, 8)}...` : 'Select a session to replay'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {!selectedSessionId && <p className="text-sm text-muted-foreground">Select a session to replay</p>}
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_320px]">
                            <div className="min-h-[600px] overflow-auto rounded-lg border border-dashed border-border bg-background p-1" ref={containerRef} />
                            <aside className="min-h-[600px] rounded-lg border border-border bg-background p-3">
                                <p className="mb-2 text-sm font-medium">Event Stream</p>
                                {sessionEvents.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No events loaded yet.</p>
                                ) : (
                                    <ul className="max-h-[560px] space-y-2 overflow-auto pr-1">
                                        {sessionEvents.slice(-200).map((event, index) => {
                                            const listIndex = sessionEvents.length - Math.min(200, sessionEvents.length) + index + 1;
                                            const descriptor = describeEvent(event);
                                            return (
                                                <li key={`${event.timestamp}-${index}`} className="rounded border px-2 py-1 text-xs">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-mono text-[10px] text-muted-foreground">#{listIndex}</span>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {descriptor.label}
                                                        </Badge>
                                                    </div>
                                                    {descriptor.detail && (
                                                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                                                            {descriptor.detail}
                                                        </p>
                                                    )}
                                                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                        {new Date(event.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </aside>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
