import { useRecorderStatus } from '@/components/layout/RecorderContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTasks } from '@/hooks/useTasks';
import { ArrowRight, CheckCircle2, CircleDashed, Clock3, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { tasks, loading, error, counts } = useTasks();
    const { sessionId, recordingState } = useRecorderStatus();
    const recentTasks = tasks.slice(0, 5);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl space-y-3">
                        <Badge variant="secondary" className="w-fit">
                            Workspace overview
                        </Badge>
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight">
                                A cleaner home for tasks and session recording.
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Use this page for at-a-glance status, then jump into tasks or
                                recording details without losing context.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild>
                            <Link to="/tasks?action=new">New task</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link to="/recording">Recording details</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total tasks</CardDescription>
                        <CardTitle className="text-3xl">{counts.all}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>In progress</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-3xl">
                            <CircleDashed className="h-5 w-5 text-muted-foreground" />
                            {counts.todo}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Completed</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-3xl">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            {counts.done}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent tasks</CardTitle>
                        <CardDescription>Quick view of the latest work items.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && (
                            <p className="text-sm text-muted-foreground">Loading tasks...</p>
                        )}
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {!loading && !error && recentTasks.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No tasks yet. Create one to start the workflow.
                            </p>
                        )}
                        <div className="space-y-2">
                            {recentTasks.map((task) => (
                                <Link
                                    key={task.id}
                                    to={`/tasks/${task.id}`}
                                    className="flex items-center justify-between rounded-lg border bg-background p-3 transition-colors hover:bg-accent/40"
                                >
                                    <div>
                                        <p className="font-medium">{task.title}</p>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {task.description || 'No description added'}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={task.status === 'done' ? 'secondary' : 'outline'}
                                    >
                                        {task.status}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Radio className="h-5 w-5 text-primary" />
                            Recording status
                        </CardTitle>
                        <CardDescription>
                            Recording stays active while you move through authenticated pages.
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
                            <p className="mt-1 text-sm text-muted-foreground">
                                {sessionId
                                    ? `Session ${sessionId.slice(0, 8)} is active.`
                                    : 'Session is initializing.'}
                            </p>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Clock3 className="h-4 w-4" />
                                Capture starts once the shell mounts.
                            </div>
                            <div className="flex items-center gap-2">
                                <ArrowRight className="h-4 w-4" />
                                Open tasks to create or edit work items.
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
