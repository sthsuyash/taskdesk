import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTasks } from '@/hooks/useTasks';
import type { Task, TaskPayload } from '@/types';
import { CheckCircle2, CircleDashed, FileText, PencilLine } from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

export default function TaskDetail() {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { tasks, loading, error, editTask, removeTask } = useTasks();
    const { toast } = useToast();
    const task = useMemo(() => tasks.find((item) => item.id === taskId) || null, [tasks, taskId]);
    const [form, setForm] = useState<TaskPayload>({ title: '', description: '', status: 'todo' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (task) {
            setForm({
                title: task.title,
                description: task.description,
                status: task.status,
            });
        }
    }, [task]);

    const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSave = async () => {
        if (!task) return;
        setSubmitting(true);
        try {
            await editTask(task.id, form);
            toast({ title: 'Task updated', description: 'Changes saved successfully.' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save task';
            toast({ title: 'Update failed', description: message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!task) return;
        setSubmitting(true);
        try {
            await removeTask(task.id);
            toast({ title: 'Task deleted', description: 'The task was removed.' });
            navigate('/tasks');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete task';
            toast({ title: 'Delete failed', description: message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <p className="text-sm text-muted-foreground">Loading task...</p>;
    }

    if (error) {
        return <p className="text-sm text-destructive">{error}</p>;
    }

    if (!task) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Task not found</CardTitle>
                    <CardDescription>
                        The task may have been deleted or you may have opened an invalid link.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link to="/tasks">Back to tasks</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <Badge variant="secondary" className="w-fit">
                            Task detail
                        </Badge>
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight">{task.title}</h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                A focused page for one task, with edit, delete, and status controls.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link to="/tasks">Back to tasks</Link>
                        </Button>
                        <Button asChild>
                            <Link to="/tasks?action=new">New task</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Status</CardDescription>
                        <CardTitle className="flex items-center gap-2 text-2xl capitalize">
                            {task.status === 'done' ? (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                                <CircleDashed className="h-5 w-5 text-muted-foreground" />
                            )}
                            {task.status}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Created</CardDescription>
                        <CardTitle className="text-2xl">
                            {new Date(task.createdAt).toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Updated</CardDescription>
                        <CardTitle className="text-2xl">
                            {new Date(task.updatedAt).toLocaleString()}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Task details
                        </CardTitle>
                        <CardDescription>Edit the task in place.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={form.status}
                                onValueChange={(value) =>
                                    setForm((current) => ({
                                        ...current,
                                        status: value as TaskPayload['status'],
                                    }))
                                }
                            >
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todo">Todo</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleSave} disabled={submitting}>
                                Save changes
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/tasks')}>
                                Close
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={submitting}
                            >
                                Delete task
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PencilLine className="h-5 w-5 text-primary" />
                            Quick summary
                        </CardTitle>
                        <CardDescription>Keep this page practical and easy to use.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>Task ID: {task.id}</p>
                        <p>{task.description || 'No description provided.'}</p>
                        <p>
                            Use this page for task-specific focus, and keep the main list for
                            scanning and quick edits.
                        </p>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
