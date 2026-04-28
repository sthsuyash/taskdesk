import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { createTask, deleteTask, listTasks, updateTask } from '@/services/tasksApi';
import { listUsers } from '@/services/usersApi';
import type { AuthUser, Task, TaskPayload } from '@/types';
import {
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    CircleDashed,
    ListTodo,
    Pencil,
    Plus,
    Search,
    Trash2,
    User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const PAGE_SIZES = [10, 25, 50, 100] as const;

const initialForm: TaskPayload = {
    title: '',
    description: '',
    status: 'todo',
};

export default function Tasks() {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [filterUser, setFilterUser] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [search, setSearch] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [form, setForm] = useState<TaskPayload>(initialForm);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [tasksData, usersData] = await Promise.all([
                listTasks(page, limit, filterStatus === 'all' ? undefined : filterStatus),
                listUsers(1, 100),
            ]);
            setTasks(tasksData.tasks);
            setTotal(tasksData.total);
            setTotalPages(tasksData.totalPages);
            setUsers(usersData.users);
        } catch {
            toast({ title: 'Failed to load data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [page, limit, filterStatus, toast]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        setPage(1);
    }, [limit, filterStatus, search]);

    const userMap = useMemo(() => {
        const map = new Map<string, AuthUser>();
        users.forEach((u) => map.set(u.id, u));
        return map;
    }, [users]);

    const filteredTasks = useMemo(() => {
        return tasks.filter((t) => {
            if (filterUser !== 'all' && t.userId !== filterUser) return false;
            if (filterStatus !== 'all' && t.status !== filterStatus) return false;
            if (
                search &&
                !t.title.toLowerCase().includes(search.toLowerCase()) &&
                !t.description.toLowerCase().includes(search.toLowerCase())
            )
                return false;
            return true;
        });
    }, [tasks, filterUser, filterStatus, search]);

    useEffect(() => {
        if (selectedTask) {
            setForm({
                title: selectedTask.title,
                description: selectedTask.description,
                status: selectedTask.status,
            });
        }
    }, [selectedTask]);

    const openCreate = () => {
        setSelectedTask(null);
        setForm(initialForm);
        setEditOpen(true);
    };

    const openEdit = (task: Task) => {
        setSelectedTask(task);
        setForm({ title: task.title, description: task.description, status: task.status });
        setEditOpen(true);
    };

    const openDelete = (task: Task) => {
        setSelectedTask(task);
        setDeleteOpen(true);
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            if (selectedTask) {
                const { task } = await updateTask(selectedTask.id, form);
                setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
                toast({ title: 'Task updated' });
            } else {
                const { task } = await createTask(form);
                setTasks((prev) => [task, ...prev]);
                toast({ title: 'Task created' });
            }
            setEditOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Operation failed';
            toast({ title: 'Failed', description: message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedTask) return;
        setSubmitting(true);
        try {
            await deleteTask(selectedTask.id);
            setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
            toast({ title: 'Task deleted' });
            setDeleteOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Delete failed';
            toast({ title: 'Delete failed', description: message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleStatus = async (task: Task) => {
        const next = task.status === 'done' ? 'todo' : 'done';
        try {
            const { task: updated } = await updateTask(task.id, { ...task, status: next });
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        } catch {
            toast({ title: 'Failed to update status', variant: 'destructive' });
        }
    };

    const canEdit = (task: Task) => {
        const owner = userMap.get(task.userId);
        return !owner || owner.role === 'user';
    };

    const counts = {
        all: tasks.length,
        done: tasks.filter((t) => t.status === 'done').length,
        todo: tasks.filter((t) => t.status === 'todo').length,
    };

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
                        <p className="text-sm text-muted-foreground">
                            Manage all tasks across users
                        </p>
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">User:</span>
                    <Select value={filterUser} onValueChange={setFilterUser}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="todo">Todo</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListTodo className="h-5 w-5 text-primary" />
                        All Tasks
                    </CardTitle>
                    <CardDescription>
                        Showing {filteredTasks.length} of {tasks.length} tasks
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <div className="overflow-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 pr-4 font-medium">Title</th>
                                        <th className="pb-3 pr-4 font-medium">User</th>
                                        <th className="pb-3 pr-4 font-medium">Status</th>
                                        <th className="pb-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredTasks.map((task) => {
                                        const owner = userMap.get(task.userId);
                                        const editable = canEdit(task);
                                        return (
                                            <tr key={task.id} className="hover:bg-accent/20">
                                                <td className="py-3 pr-4">
                                                    <button
                                                        type="button"
                                                        className="text-left"
                                                        onClick={() => void toggleStatus(task)}
                                                    >
                                                        <p
                                                            className={`font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : ''}`}
                                                        >
                                                            {task.title}
                                                        </p>
                                                        {task.description && (
                                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                                {task.description}
                                                            </p>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">
                                                            {owner?.email ??
                                                                task.userId.slice(0, 8)}
                                                        </span>
                                                        {owner && (
                                                            <Badge
                                                                variant={
                                                                    owner.role === 'user'
                                                                        ? 'secondary'
                                                                        : owner.role === 'admin'
                                                                          ? 'destructive'
                                                                          : 'default'
                                                                }
                                                                className="text-[10px]"
                                                            >
                                                                {owner.role}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <Badge
                                                        variant={
                                                            task.status === 'done'
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {task.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openEdit(task)}
                                                            disabled={!editable}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => openDelete(task)}
                                                            disabled={!editable}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredTasks.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="py-6 text-center text-muted-foreground"
                                            >
                                                No tasks found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t px-3 py-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Show</span>
                            <Select
                                value={String(limit)}
                                onValueChange={(v) => setLimit(Number(v))}
                            >
                                <SelectTrigger className="h-8 w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZES.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">per page</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                                Page {page} of {totalPages || 1}
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
                        <DialogDescription>
                            {selectedTask ? 'Update task details' : 'Fill in the task information'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Task title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, description: e.target.value }))
                                }
                                placeholder="Description (optional)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={form.status}
                                onValueChange={(v) =>
                                    setForm((f) => ({ ...f, status: v as TaskPayload['status'] }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todo">Todo</SelectItem>
                                    <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={submitting || !form.title.trim()}>
                            {submitting ? 'Saving...' : selectedTask ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{selectedTask?.title}</strong>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
