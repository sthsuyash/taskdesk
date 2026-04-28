import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSessionEvents, listSessions } from '@/services/sessionsApi';
import { listUsers } from '@/services/usersApi';
import type { AuthUser, SessionSummary } from '@/types';
import {
    Clock3,
    ExternalLink,
    Info,
    LayoutPanelTop,
    List,
    MousePointerClick,
    PlayCircle,
    Search,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

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

interface PageEntry {
    id: string;
    url: string;
    label: string;
    firstSeenAt: number;
    eventIndex: number;
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

function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString();
}

function formatDuration(durationMs: number) {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
        return `${seconds}s`;
    }

    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
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
                    ? { label: 'Navigation', detail: formatUrlDisplay(eventUrl) }:
                    { label: 'Incremental' };
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
    const pages: PageEntry[] = [];
    const seen = new Set<string>();

    const pushPage = (url: string, eventIndex: number, timestamp: number, label: string) => {
        const normalized = url.trim();
        if (!normalized || seen.has(normalized)) {
            return;
        }

        seen.add(normalized);
        pages.push({
            id: `${eventIndex}-${normalized}`,
            url: normalized,
            label,
            firstSeenAt: timestamp,
            eventIndex,
        });
    };

    pushPage(fallbackUrl, 0, events[0]?.timestamp ?? Date.now(), 'Entry point');

    events.forEach((event, index) => {
        const url = extractEventUrl(event);
        if (!url) {
            return;
        }

        const label = index === 0 ? 'Page Load' : 'Navigation';
        pushPage(url, index, event.timestamp, label);
    });

    return pages;
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

    const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

    const load = useCallback(async () => {
        try {
            const [sessionsData, usersData] = await Promise.all([listSessions(), listUsers(1, 100)]);
            setSessions(sessionsData.sessions || []);
            setUsers(usersData.users);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    }, []);

    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            if (filterUser !== 'all' && session.userId !== filterUser) {
                return false;
            }

            if (search) {
                const owner = userMap.get(session.userId);
                const searchLower = search.toLowerCase();

                if (
                    !owner?.email.toLowerCase().includes(searchLower) &&
                    !session.id.toLowerCase().includes(searchLower) &&
                    !session.url.toLowerCase().includes(searchLower)
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [filterUser, search, sessions, userMap]);

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
    const selectedPage =
        selectedPageIndex !== null ? pageEntries[selectedPageIndex] || null : null;

    const isLiveSession = (session: SessionSummary) => {
        const liveWindowMs = 15000;
        return Date.now() - session.lastEventAt <= liveWindowMs;
    };

    useEffect(() => {
        void load();
        const intervalId = window.setInterval(() => void load(), 5000);
        return () => window.clearInterval(intervalId);
    }, [load]);

    useEffect(() => {
        if (!filteredSessions.length) {
            return;
        }

        if (!selectedSessionId || !filteredSessions.some((session) => session.id === selectedSessionId)) {
            setSelectedSessionId(filteredSessions[0].id);
        }
    }, [filteredSessions, selectedSessionId]);

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
                setSessionEvents(typedEvents);
                setSelectedEventIndex(0);
                setSelectedPageIndex(0);

                playerRef.current = new rrwebPlayer({
                    target: containerRef.current,
                    props: { events: typedEvents },
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
            if (playerRef.current?.$destroy) {
                playerRef.current.$destroy();
                playerRef.current = null;
            }

            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [selectedSessionId, toast]);

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
                            <Button variant="outline" onClick={() => navigate(`/live?session=${selectedSessionId}`)}>
                                Watch live
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-[320px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by session ID, URL, or user email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                </div>

                <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="w-[230px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All users ({sessions.length})</SelectItem>
                        {users.map((user) => {
                            const count = sessions.filter((session) => session.userId === user.id).length;
                            return (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.email} ({count})
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>

                <span className="text-sm text-muted-foreground">
                    Showing {filteredSessions.length} of {sessions.length} sessions
                </span>
            </div>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {owner && (
                                    <Badge variant="outline" className="gap-1 text-[10px]">
                                        <User className="h-3 w-3" />
                                        {owner.email}
                                    </Badge>
                                )}
                                {selectedSession && (
                                    <Badge variant="outline" className="gap-1 text-[10px]">
                                        <Clock3 className="h-3 w-3" />
                                        {formatDate(selectedSession.startedAt)}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4">
                        {loading && <p className="text-sm text-muted-foreground">Loading replay...</p>}
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {!selectedSessionId && (
                            <p className="text-sm text-muted-foreground">Select a session to replay.</p>
                        )}

                        <div className="rounded-xl border bg-background p-2 shadow-sm">
                            <div
                                ref={containerRef}
                                className="min-h-[680px] overflow-auto rounded-lg bg-background"
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
                                    <div className="max-h-[640px] space-y-2 overflow-auto pr-1">
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
                                                                <Badge variant="outline" className="text-[10px]">
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
                                    <span>{pageEntries.length} discovered</span>
                                </div>

                                {pageEntries.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No page data found for this session.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {pageEntries.map((page, index) => {
                                            const isSelected = selectedPageIndex === index;

                                            return (
                                                <button
                                                    key={page.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPageIndex(index);
                                                        setSelectedTab('details');
                                                    }}
                                                    className={`w-full rounded-xl border p-3 text-left transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'bg-background hover:bg-accent/40'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    {page.label}
                                                                </Badge>
                                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                                    #{page.eventIndex + 1}
                                                                </span>
                                                            </div>
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {formatUrlDisplay(page.url)}
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
                            <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border bg-background p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Session
                                        </p>
                                        <p className="mt-2 text-sm font-medium">
                                            {selectedSession?.id || 'No session selected'}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {selectedSession ? formatUrlDisplay(selectedSession.url) : ''}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border bg-background p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Owner
                                        </p>
                                        <p className="mt-2 text-sm font-medium">
                                            {owner?.email || 'Unassigned'}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {owner?.role || 'unknown role'}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border bg-background p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Events
                                        </p>
                                        <p className="mt-2 text-sm font-medium">
                                            {selectedSession?.eventCount ?? 0}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border bg-background p-4">
                                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Duration
                                        </p>
                                        <p className="mt-2 text-sm font-medium">
                                            {selectedSession
                                                ? formatDuration(selectedSession.durationMs)
                                                : '0s'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                        Selected event
                                    </p>
                                    {selectedEvent ? (
                                        <div className="mt-3 space-y-2">
                                            <p className="font-medium text-foreground">
                                                {selectedEvent.label}
                                            </p>
                                            {selectedEvent.detail && (
                                                <p className="text-xs text-muted-foreground">
                                                    {selectedEvent.detail}
                                                </p>
                                            )}
                                            <p className="font-mono text-xs text-muted-foreground">
                                                #{selectedEvent.index + 1} · {selectedEvent.timeLabel}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Choose an event from the Events tab to inspect it here.
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                        Selected page
                                    </p>
                                    {selectedPage ? (
                                        <div className="mt-3 space-y-2">
                                            <p className="font-medium text-foreground">
                                                {selectedPage.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatUrlDisplay(selectedPage.url)}
                                            </p>
                                            <p className="font-mono text-xs text-muted-foreground">
                                                #{selectedPage.eventIndex + 1} · {formatDate(selectedPage.firstSeenAt)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Choose a page from the Pages tab to inspect it here.
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-xl border bg-accent/30 p-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 font-medium text-foreground">
                                        <Info className="h-4 w-4 text-primary" />
                                        Session metadata
                                    </div>
                                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                                        <p>Started: {selectedSession ? formatDate(selectedSession.startedAt) : '—'}</p>
                                        <p>Last event: {selectedSession ? formatDate(selectedSession.lastEventAt) : '—'}</p>
                                        <p className="break-all">User agent: {selectedSession?.userAgent || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle>Session history</CardTitle>
                    <CardDescription>
                        Browse the captured sessions for the currently filtered visitor list.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {filteredSessions.map((session) => {
                                const sessionOwner = userMap.get(session.userId);
                                const active = selectedSessionId === session.id;

                                return (
                                    <button
                                        key={session.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSessionId(session.id);
                                            setSelectedTab('events');
                                        }}
                                        className={`min-w-[220px] flex-1 shrink-0 rounded-2xl border p-4 text-left transition-colors ${active ? 'border-primary bg-primary/5' : 'bg-background hover:bg-accent/40'}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-mono text-sm font-semibold">
                                                    {session.id.slice(0, 8)}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatDate(session.startedAt)}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">
                                                {session.eventCount} events
                                            </Badge>
                                        </div>

                                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                            <p className="truncate">{formatUrlDisplay(session.url)}</p>
                                            <p className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {sessionOwner?.email || 'Unknown user'}
                                            </p>
                                            <p className="flex items-center gap-1">
                                                <MousePointerClick className="h-3 w-3" />
                                                {formatDuration(session.durationMs)}
                                            </p>
                                        </div>

                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-xs font-medium text-primary">
                                                Open replay
                                            </span>
                                            {isLiveSession(session) && (
                                                <span className="text-xs text-muted-foreground">
                                                    Live available
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
