import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { getSessionEvents, listSessions } from '@/services/sessionsApi';
import { listUsers } from '@/services/usersApi';
import type { AuthUser, SessionSummary } from '@/types';
import {
    Clock3,
    ExternalLink,
    Info,
    LayoutPanelTop,
    List,
    PlayCircle,
    Radio,
    Search,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

interface RrwebPlayerInstance {
    $destroy?: () => void;
    goto?: (timeOffset: number, play?: boolean) => void;
    addEventListener?: (event: string, handler: (params: unknown) => unknown) => void;
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

interface PageEntry {
    id: string;
    url: string;
    label: string;
    firstSeenAt: number;
}

type InspectorTab = 'events' | 'pages' | 'details';

const INSPECTOR_TABS: Array<{
    key: InspectorTab;
    label: string;
    icon: typeof List;
}> = [
    { key: 'events', label: 'Events', icon: List },
    { key: 'pages', label: 'Pages', icon: LayoutPanelTop },
    { key: 'details', label: 'Details', icon: Info },
];

function formatDuration(durationMs: number) {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
        return `${seconds}s`;
    }

    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function formatChapterTime(offsetMs: number) {
    const totalSeconds = Math.max(0, Math.floor(offsetMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

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

function extractCustomTag(event: EventWithTime): string | undefined {
    if (event.type !== 5 || !event.data || typeof event.data !== 'object') {
        return undefined;
    }

    const record = event.data as Record<string, unknown>;
    const tag = record.tag;
    return typeof tag === 'string' ? tag : undefined;
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

function derivePages(events: EventWithTime[], fallbackUrl: string) {
    const rawPages: PageEntry[] = [];
    const pushRawPage = (url: string, idHint: string, timestamp: number, label: string) => {
        const normalized = url.trim();
        if (!normalized) {
            return;
        }

        rawPages.push({
            id: `${idHint}-${timestamp}`,
            url: normalized,
            label,
            firstSeenAt: timestamp,
        });
    };

    if (fallbackUrl) {
        pushRawPage(fallbackUrl, 'entry', events[0]?.timestamp ?? Date.now(), 'Started here');
    }

    events.forEach((event, index) => {
        const url = extractEventUrl(event);
        const tag = extractCustomTag(event);

        // rrweb meta events usually carry href for full page loads.
        if (event.type === 4 && url) {
            pushRawPage(url, `meta-${index}`, event.timestamp, 'Visited page');
            return;
        }

        // Explicit app route changes from the UI shell.
        if (event.type === 5 && tag === 'route-change' && url) {
            pushRawPage(url, `route-${index}`, event.timestamp, 'Visited page');
            return;
        }

        if (!url) {
            return;
        }

        // Fallback: keep navigation-like URL transitions we can infer from the event payload.
        const descriptor = describeEvent(event);
        if (descriptor.label === 'Navigation' || descriptor.label === 'Page Load') {
            pushRawPage(url, `fallback-${index}`, event.timestamp, 'Visited page');
        }
    });

    // Keep a timeline-style list: only remove consecutive duplicates of the same page.
    const pages: PageEntry[] = [];
    let previousPageKey = '';

    for (const page of rawPages) {
        const currentPageKey = formatUrlDisplay(page.url).toLowerCase();
        if (currentPageKey === previousPageKey) {
            continue;
        }

        pages.push(page);
        previousPageKey = currentPageKey;
    }

    return pages;
}

function getSeekOffset(startTime: number, targetTime: number) {
    return Math.max(0, targetTime - startTime);
}

function findActivePageIndex(pages: PageEntry[], absoluteTimestamp: number) {
    if (!pages.length) {
        return null;
    }

    let activeIndex = 0;
    for (let index = 0; index < pages.length; index += 1) {
        if (pages[index].firstSeenAt <= absoluteTimestamp) {
            activeIndex = index;
        } else {
            break;
        }
    }

    return activeIndex;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<RrwebPlayerInstance | null>(null);

    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [selectedTab, setSelectedTab] = useState<InspectorTab>('events');
    const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
    const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sessionEvents, setSessionEvents] = useState<EventWithTime[]>([]);
    const [filterUser, setFilterUser] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [total, setTotal] = useState(0);

    const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

    const load = useCallback(async () => {
        try {
            const [sessionsData, usersData] = await Promise.all([
                listSessions(page, limit),
                listUsers(1, 100),
            ]);
            setSessions(sessionsData.sessions || []);
            setTotal(sessionsData.total || 0);
            setUsers(usersData.users);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    }, [page, limit]);

    const filteredSessions = sessions;
    const totalPages = Math.ceil(total / limit);

    const selectedSession = useMemo(
        () => sessions.find((session) => session.id === selectedSessionId) || null,
        [selectedSessionId, sessions]
    );

    const owner = useMemo(
        () => (selectedSession ? userMap.get(selectedSession.userId) || null : null),
        [selectedSession, userMap]
    );

    const eventRows = useMemo(
        () =>
            sessionEvents.map((event, index) => ({
                id: `${event.timestamp}-${index}`,
                event,
                index,
                timeLabel: new Date(event.timestamp).toLocaleTimeString(),
                ...describeEvent(event),
            })),
        [sessionEvents]
    );

    const visibleEventRows = useMemo(() => eventRows.slice(-200), [eventRows]);

    const pageEntries = useMemo(
        () => derivePages(sessionEvents, selectedSession?.url || ''),
        [selectedSession?.url, sessionEvents]
    );

    const selectedEvent =
        selectedEventIndex !== null ? eventRows[selectedEventIndex] || null : null;
    const selectedPage = selectedPageIndex !== null ? pageEntries[selectedPageIndex] || null : null;

    const seekToTimestamp = useCallback(
        (targetTimestamp: number) => {
            const player = playerRef.current;
            const startTime = sessionEvents[0]?.timestamp;

            if (!player?.goto || !startTime) {
                return;
            }

            player.goto(getSeekOffset(startTime, targetTimestamp), false);
        },
        [sessionEvents]
    );

    const isLiveSession = (session: SessionSummary) => {
        const liveWindowMs = 15000;
        return Date.now() - session.lastEventAt <= liveWindowMs;
    };

    useEffect(() => {
        void load();
        const intervalId = window.setInterval(() => void load(), 5000);
        return () => window.clearInterval(intervalId);
    }, [load, page, limit]);

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
                    setSessionEvents([]);
                    return;
                }

                if (playerRef.current?.$destroy) {
                    playerRef.current.$destroy();
                    playerRef.current = null;
                }

                containerRef.current.innerHTML = '';

                const typedEvents = events as EventWithTime[];
                const pagesForSession = derivePages(typedEvents, selectedSession?.url || '');
                setSessionEvents(typedEvents);
                setSelectedEventIndex(0);
                setSelectedPageIndex(pagesForSession.length ? 0 : null);

                const player = new rrwebPlayer({
                    target: containerRef.current,
                    props: { events: typedEvents },
                }) as RrwebPlayerInstance;

                playerRef.current = player;

                player.addEventListener?.('ui-update-current-time', (detail) => {
                    const payload =
                        detail && typeof detail === 'object' && 'payload' in detail
                            ? (detail as { payload?: unknown }).payload
                            : detail;

                    if (typeof payload !== 'number') {
                        return;
                    }

                    const startTime = typedEvents[0]?.timestamp;
                    if (!startTime) {
                        return;
                    }

                    const absoluteTimestamp = startTime + payload;
                    const nextIndex = findActivePageIndex(pagesForSession, absoluteTimestamp);

                    if (nextIndex === null) {
                        return;
                    }

                    setSelectedPageIndex((current) =>
                        current === nextIndex ? current : nextIndex
                    );
                });
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
            if (playerRef.current?.$destroy) {
                playerRef.current.$destroy();
                playerRef.current = null;
            }

            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [selectedSession?.url, selectedSessionId, toast]);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <Badge variant="secondary" className="w-fit">
                            Session dashboard
                        </Badge>
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">
                                Replay, events, pages, and details in one view.
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                Browse the replay on the left and inspect session activity in the
                                tabbed rail on the right.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => void load()}>
                            Refresh
                        </Button>
                        {selectedSessionId && (
                            <Button
                                variant="outline"
                                onClick={() => navigate(`/live?session=${selectedSessionId}`)}
                            >
                                Watch live
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                </div>

                <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by user" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All users ({sessions.length})</SelectItem>
                        {users.map((user) => {
                            const count = sessions.filter(
                                (session) => session.userId === user.id
                            ).length;
                            return (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.email} ({count})
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>

                <span className="text-sm text-muted-foreground">
                    {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
                </span>
            </div>

            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    {sessions.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-sm text-muted-foreground">
                                Recording will appear here once users start sessions
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {sessions.map((session) => {
                                const sessionOwner = userMap.get(session.userId);
                                const active = selectedSessionId === session.id;
                                const live = isLiveSession(session);

                                return (
                                    <div
                                        key={session.id}
                                        className={`flex items-center gap-4 p-4 transition-colors ${active ? 'bg-primary/5' : 'hover:bg-accent/20'}`}
                                    >
                                        <div className="min-w-0 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {live && (
                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                                                )}
                                                <span className="font-mono text-sm font-medium">
                                                    {session.id.slice(0, 8)}
                                                </span>
                                                <Badge
                                                    variant={live ? 'secondary' : 'outline'}
                                                    className="text-[10px]"
                                                >
                                                    {live ? 'Live' : `${session.eventCount} events`}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground truncate">
                                                {sessionOwner?.email || 'Unknown user'} ·{' '}
                                                {formatDate(session.startedAt)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {live ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        navigate(`/live?session=${session.id}`)
                                                    }
                                                >
                                                    <Radio className="mr-1 h-3 w-3" />
                                                    Watch Live
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant={active ? 'default' : 'outline'}
                                                    onClick={() => {
                                                        setSelectedSessionId(session.id);
                                                        setSelectedTab('events');
                                                    }}
                                                >
                                                    <PlayCircle className="mr-1 h-3 w-3" />
                                                    {active ? 'Playing' : 'Play'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                            Showing {sessions.length} of {total} sessions
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="rounded px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span className="px-2 text-xs">
                                Page {page} of {totalPages || 1}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="rounded px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_325px] xl:grid-cols-[1fr]">
                <Card className="overflow-hidden">
                    <CardHeader className="space-y-3 border-b bg-muted/30">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <PlayCircle className="h-5 w-5 text-primary" />
                                    Replay
                                </CardTitle>
                                <CardDescription>
                                    {selectedSession
                                        ? `${formatUrlDisplay(selectedSession.url)} · ${selectedSession.eventCount} events`
                                        : 'Select a session to start replaying'}
                                </CardDescription>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                {owner && (
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" />
                                        <span className="text-foreground font-medium">
                                            {owner.email}
                                        </span>
                                    </div>
                                )}
                                {selectedSession && (
                                    <div className="flex items-center gap-2">
                                        <Clock3 className="h-4 w-4 text-primary" />
                                        <span className="text-foreground font-medium">
                                            {formatDate(selectedSession.startedAt, { time: true })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4">
                        {loading && (
                            <p className="text-sm text-muted-foreground">Loading replay...</p>
                        )}
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {!selectedSessionId && (
                            <p className="text-sm text-muted-foreground">
                                Select a session to replay.
                            </p>
                        )}

                        <div className="rounded-xl border bg-background p-2 shadow-sm">
                            <div
                                ref={containerRef}
                                className="min-h-[650px] overflow-auto rounded-lg bg-background"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="space-y-0 border-b bg-muted/30 p-0">
                        <div className="grid grid-cols-3">
                            {INSPECTOR_TABS.map((tab) => {
                                const Icon = tab.icon;
                                const active = selectedTab === tab.key;

                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setSelectedTab(tab.key)}
                                        className={`flex items-center justify-center gap-2 border-b-2 px-3 py-4 text-sm font-medium transition-colors ${active ? 'border-primary bg-background text-foreground' : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground'}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </CardHeader>

                    <CardContent className="p-4">
                        {selectedTab === 'events' && (
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
                                                        setSelectedTab('details');
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
                        )}

                        {selectedTab === 'pages' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Pages</span>
                                    <span>{pageEntries.length} steps</span>
                                </div>

                                {pageEntries.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No page journey found for this session.
                                    </p>
                                ) : (
                                    <div className="max-h-[640px] overflow-auto pr-1 space-y-2">
                                        {pageEntries.map((page, index) => {
                                            const isSelected = selectedPageIndex === index;
                                            const startTime =
                                                pageEntries[0]?.firstSeenAt ?? page.firstSeenAt;
                                            const chapterOffset = page.firstSeenAt - startTime;

                                            return (
                                                <button
                                                    key={page.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPageIndex(index);
                                                        seekToTimestamp(page.firstSeenAt);
                                                    }}
                                                    className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'bg-background hover:bg-accent/40'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 space-y-1">
                                                            <p className="font-mono text-xs font-semibold text-primary">
                                                                {formatChapterTime(chapterOffset)}
                                                            </p>
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {formatUrlDisplay(page.url)}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {page.label}
                                                            </p>
                                                        </div>
                                                        <div className="text-right text-[10px] text-muted-foreground">
                                                            <p>{formatDate(page.firstSeenAt)}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedTab === 'details' && (
                            <div className="max-h-[640px] overflow-auto space-y-4">
                                <div className="rounded-xl border bg-background p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                        Session overview
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                                Session id
                                            </p>
                                            <p className="mt-1 break-all text-sm font-medium text-foreground">
                                                {selectedSession?.id || 'No session selected'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                                Owner
                                            </p>
                                            <p className="mt-1 text-sm text-foreground">
                                                {owner?.email || 'Unassigned'}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {owner?.role || 'unknown role'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                                IP Address
                                            </p>
                                            <p className="mt-1 text-sm font-mono text-foreground">
                                                {selectedSession?.ipAddress || '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border bg-background p-4">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                        Recording stats
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                                Events captured
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-foreground">
                                                {selectedSession?.eventCount ?? 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                                Duration
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-foreground">
                                                {selectedSession
                                                    ? formatDuration(selectedSession.durationMs)
                                                    : '0s'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                                Started
                                            </p>
                                            <p className="mt-1 text-sm text-foreground">
                                                {selectedSession
                                                    ? formatDate(selectedSession.startedAt)
                                                    : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                                Last event
                                            </p>
                                            <p className="mt-1 text-sm text-foreground">
                                                {selectedSession
                                                    ? formatDate(selectedSession.lastEventAt)
                                                    : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border bg-accent/30 p-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 font-medium text-foreground">
                                        <Info className="h-4 w-4 text-primary" />
                                        Browser info
                                    </div>
                                    <p className="mt-3 break-all text-xs leading-5 text-muted-foreground">
                                        {selectedSession?.userAgent ||
                                            'No user agent captured for this session.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
