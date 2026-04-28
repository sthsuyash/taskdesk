import { useRecorderStatus } from '@/components/layout/RecorderContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleDashed, Layers3, Radio, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const captureNotes = [
    'Navigation and form interactions across authenticated pages',
    'Task create, edit, and delete actions',
    'Custom task events emitted from the workspace',
];

export default function Recording() {
    const { sessionId, recordingState } = useRecorderStatus();

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Badge variant="secondary" className="w-fit">
                            Session recording
                        </Badge>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                            Recording follows the user across the whole app.
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            This page gives a practical view of what the recorder is doing and what
                            gets captured.
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link to="/sessions">Open sessions</Link>
                    </Button>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Radio className="h-5 w-5 text-primary" />
                            Live status
                        </CardTitle>
                        <CardDescription>
                            Current recorder state and active session.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-xl border bg-background p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                State
                            </p>
                            <p className="mt-2 text-lg font-semibold capitalize">
                                {recordingState}
                            </p>
                        </div>
                        <div className="rounded-xl border bg-background p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                Session
                            </p>
                            <p className="mt-2 font-medium">
                                {sessionId ? sessionId : 'No session id yet'}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                The session is created automatically when the authenticated shell
                                mounts.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers3 className="h-5 w-5 text-primary" />
                            What gets captured
                        </CardTitle>
                        <CardDescription>
                            Keep the scope practical and focused for support and review.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {captureNotes.map((note) => (
                                <li
                                    key={note}
                                    className="flex items-start gap-2 rounded-lg border bg-background p-3"
                                >
                                    <CircleDashed className="mt-0.5 h-4 w-4 text-primary" />
                                    <span>{note}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="rounded-xl border bg-accent/30 p-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                Production-wise guidance
                            </div>
                            <p className="mt-2">
                                Keep the recorder visible in the shell, not inside one page, so
                                navigation does not break the session.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
