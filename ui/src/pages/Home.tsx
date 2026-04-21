import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleDashed, Radio } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { useSessionRecorder } from '../hooks/useSessionRecorder';
import type { Task, TaskPayload } from '../types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const initialForm: TaskPayload = {
    title: '',
    description: '',
    status: 'todo',
};

export default function Home() {
    const {
        tasks,
        loading,
        error,
        addTask,
        editTask,
        removeTask,
        counts,
    } = useTasks();
    const { sessionId, recordingState, emitCustomEvent } = useSessionRecorder();

    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [form, setForm] = useState<TaskPayload>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (searchParams.get('action') !== 'new') {
            return;
        }

        setActiveTask(null);
        titleInputRef.current?.focus();

        const next = new URLSearchParams(searchParams);
        next.delete('action');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (activeTask) {
            setForm({
                title: activeTask.title || '',
                description: activeTask.description || '',
                status: activeTask.status || 'todo',
            });
            return;
        }

        setForm(initialForm);
    }, [activeTask]);

    const handleCreate = async (payload: TaskPayload) => {
        setSubmitting(true);
        try {
            const task = await addTask(payload);
            emitCustomEvent('task-created', {
                taskId: task.id,
                title: task.title,
                status: task.status,
            });
            setForm(initialForm);
            toast({
                title: 'Task created',
                description: 'A new task was added successfully.',
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create task';
            toast({
                title: 'Create failed',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async (payload: TaskPayload) => {
        if (!activeTask) return;
        setSubmitting(true);
        try {
            const task = await editTask(activeTask.id, payload);
            emitCustomEvent('task-updated', {
                taskId: task.id,
                title: task.title,
                status: task.status,
            });
            setActiveTask(null);
            toast({
                title: 'Task updated',
                description: 'Your changes were saved.',
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update task';
            toast({
                title: 'Update failed',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleTask = async (task: Task) => {
        try {
            const nextStatus = task.status === 'done' ? 'todo' : 'done';
            const updatedTask = await editTask(task.id, {
                title: task.title,
                description: task.description,
                status: nextStatus,
            });
            emitCustomEvent('task-status-changed', {
                taskId: updatedTask.id,
                title: updatedTask.title,
                status: updatedTask.status,
            });
            toast({
                title: 'Task status changed',
                description: `Task marked as ${nextStatus}.`,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to change task status';
            toast({
                title: 'Status update failed',
                description: message,
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async (taskId: string) => {
        try {
            const taskToDelete = tasks.find((task) => task.id === taskId);
            await removeTask(taskId);
            emitCustomEvent('task-deleted', {
                taskId,
                title: taskToDelete?.title,
            });
            toast({
                title: 'Task deleted',
                description: 'Task removed from your list.',
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete task';
            toast({
                title: 'Delete failed',
                description: message,
                variant: 'destructive',
            });
        }
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (activeTask) {
            await handleUpdate(form);
            return;
        }
        await handleCreate(form);
    };

    const recorderBadgeLabel = recordingState === 'error'
        ? 'Recorder error'
        : sessionId
            ? `Recording: ${sessionId.slice(0, 8)}...`
            : 'Recorder initializing';

    const recorderBadgeVariant = recordingState === 'error' ? 'destructive' : 'secondary';

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Tasks Workspace</h2>
                        <p className="text-sm text-muted-foreground">Manage tasks while rrweb records your session.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={recorderBadgeVariant} className="w-fit">
                            <Radio className="mr-2 h-3.5 w-3.5" />
                            {recorderBadgeLabel}
                        </Badge>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total</CardDescription>
                        <CardTitle className="text-3xl">{counts.all}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Todo</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-3xl">
                            <CircleDashed className="h-5 w-5 text-muted-foreground" />
                            {counts.todo}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Done</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-3xl">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            {counts.done}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>{activeTask ? 'Edit Task' : 'Create Task'}</CardTitle>
                        <CardDescription>
                            {activeTask ? 'Update task details and save changes.' : 'Capture a task title, description, and status.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    ref={titleInputRef}
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="Task title"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Description"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(value) =>
                                        setForm((current) => ({ ...current, status: value as TaskPayload['status'] }))
                                    }
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select task status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todo">Todo</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : activeTask ? 'Update' : 'Create'}
                                </Button>
                                {activeTask && (
                                    <Button type="button" variant="secondary" onClick={() => setActiveTask(null)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Task List</CardTitle>
                        <CardDescription>Click a task body to toggle todo/done state.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <ul className="space-y-2">
                            {tasks.map((task) => (
                                <li
                                    key={task.id}
                                    className="rounded-lg border bg-background p-3 transition-colors hover:bg-accent/40"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <button
                                            type="button"
                                            className="flex-1 text-left"
                                            onClick={() => toggleTask(task)}
                                        >
                                            <p className={`font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>
                                                {task.title}
                                            </p>
                                            {task.description && (
                                                <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                                            )}
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={task.status === 'done' ? 'secondary' : 'outline'}>{task.status}</Badge>
                                            <Button size="sm" variant="outline" onClick={() => setActiveTask(task)}>
                                                Edit
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="destructive">
                                                        Delete
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. The task will be permanently removed.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={() => handleDelete(task.id)}
                                                        >
                                                            Delete Task
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {!loading && tasks.length === 0 && (
                                <li className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    No tasks yet. Create your first one.
                                </li>
                            )}
                        </ul>
                    </CardContent>
                </Card>
            </section>

            <div className="text-xs text-muted-foreground">
                Recorder state: <span className="font-medium">{recordingState}</span>
            </div>
        </div>
    );
}