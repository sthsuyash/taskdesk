import { useRecorderStatus } from '@/components/layout/RecorderContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getSessionEvents, listSessions } from '@/services/sessionsApi';
import type { SessionSummary } from '@/types';
import { Clock3, ListFilter, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function formatDate(value: number) {
    return new Date(value).toLocaleString();
}

export default function Sessions() {
    const { sessionId, recordingState } = useRecorderStatus();
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [search, setSearch] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [eventsCount, setEventsCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [error, setError] = useState('');
    const [selectedError, setSelectedError] = useState('');
    const { toast } = useToast();

    const selectedSession = useMemo(
        () => sessions.find((session) => session.id === selectedSessionId) || null,
        [sessions, selectedSessionId]
    );

    const filteredSessions = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return sessions;
        return sessions.filter((session) => {
            return (
                session.id.toLowerCase().includes(query) ||
                session.url.toLowerCase().includes(query) ||
                session.userId.toLowerCase().includes(query)
            );
        });
    }, [search, sessions]);

    const loadSessions = async () => {
        setLoading(true);
        setError('');
        try {
            const { sessions: rows } = await listSessions();
            setSessions(rows || []);
            setSelectedSessionId((current) => current || rows?.[0]?.id || '');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load sessions';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadSessions();
    }, []);

    useEffect(() => {
        const loadEvents = async () => {
            if (!selectedSessionId) {
                setEventsCount(null);
                return;
            }

            setLoadingEvents(true);
            setSelectedError('');
            try {
                const { events } = await getSessionEvents(selectedSessionId);
                setEventsCount(events.length);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'Failed to load session events';
                setSelectedError(message);
                toast({
                    title: 'Replay data unavailable',
                    description: message,
                    variant: 'destructive',
                });
            } finally {
                setLoadingEvents(false);
            }
        };

        void loadEvents();
    }, [selectedSessionId, toast]);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <Badge variant="secondary" className="w-fit">
                            Session recording
                        </Badge>
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight">
                                Recorded sessions
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Browse real recorded sessions and inspect their event payloads.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => void loadSessions()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Sessions</CardDescription>
                        <CardTitle className="text-3xl">{sessions.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Selected events</CardDescription>
                        <CardTitle className="text-3xl">
                            {loadingEvents ? '...' : (eventsCount ?? 0)}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Recorder</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-2xl capitalize">
                            <Radio className="h-5 w-5 text-primary" />
                            {recordingState}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ListFilter className="h-5 w-5 text-primary" />
                            Session list
                        </CardTitle>
                        <CardDescription>
                            Simple, practical view of what is already being recorded.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            placeholder="Search by session id, URL, or user id"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />

                        {loading && (
                            <p className="text-sm text-muted-foreground">Loading sessions...</p>
                        )}
                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <div className="space-y-2">
                            {filteredSessions.map((session) => (
                                <button
                                    key={session.id}
                                    type="button"
                                    onClick={() => setSelectedSessionId(session.id)}
                                    className={`w-full rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent/40 ${selectedSessionId === session.id ? 'border-primary bg-accent/50' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="font-medium">{session.url}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {session.id}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                User: {session.userId}
                                            </p>
                                        </div>
                                        <div className="text-right text-xs text-muted-foreground">
                                            <p>{formatDate(session.startedAt)}</p>
                                            <p>{session.eventCount} events</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {!loading && filteredSessions.length === 0 && (
                                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    No sessions match the current search.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Selected session</CardTitle>
                        <CardDescription>
                            {selectedSession
                                ? selectedSession.id
                                : 'Choose a session to inspect it'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!selectedSession && (
                            <p className="text-sm text-muted-foreground">
                                Select a session from the list to view details.
                            </p>
                        )}
                        {selectedSession && (
                            <>
                                <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">URL</p>
                                    <p className="mt-1 break-all">{selectedSession.url}</p>
                                </div>
                                <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">Timeline</p>
                                    <p className="mt-1">
                                        Started: {formatDate(selectedSession.startedAt)}
                                    </p>
                                    <p>Last event: {formatDate(selectedSession.lastEventAt)}</p>
                                    <p>
                                        Duration: {Math.round(selectedSession.durationMs / 1000)}s
                                    </p>
                                </div>
                                <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">Events</p>
                                    <p className="mt-1">
                                        {selectedError
                                            ? selectedError
                                            : loadingEvents
                                              ? 'Loading event payload...'
                                              : `Loaded ${eventsCount ?? 0} events.`}
                                    </p>
                                    <p className="mt-1">
                                        The actual replay viewer lives in the support dashboard, but
                                        this page keeps the data close to the app.
                                    </p>
                                </div>
                                <div className="rounded-xl border bg-accent/30 p-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 font-medium text-foreground">
                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                        Live recorder state
                                    </div>
                                    <p className="mt-2">Session id: {sessionId || 'none'}</p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
