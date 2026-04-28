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
import { useToast } from '@/hooks/use-toast';
import { createUser, deleteUser, listUsers, updateUser } from '@/services/usersApi';
import { useAuthStore } from '@/store/authStore';
import type { AuthUser } from '@/types';
import { formatDate } from '@/lib/utils';
import {
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users as UsersIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const PAGE_SIZES = [10, 25, 50, 100] as const;
const ROLES: { label: string; value: AuthUser['role'] | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Admin', value: 'admin' },
    { label: 'Support', value: 'support' },
    { label: 'User', value: 'user' },
];

const ROLE_LABELS: Record<AuthUser['role'], string> = {
    admin: 'Admin',
    support: 'Support',
    user: 'User',
};

const ROLE_COLORS: Record<AuthUser['role'], 'default' | 'secondary' | 'destructive'> = {
    admin: 'destructive',
    support: 'default',
    user: 'secondary',
};

interface UserForm {
    email: string;
    role: AuthUser['role'];
    password: string;
}

export default function Users() {
    const { toast } = useToast();
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [sortBy, setSortBy] = useState<'created_at' | 'email' | 'role'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterRole, setFilterRole] = useState<AuthUser['role'] | 'all'>('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
    const [form, setForm] = useState<UserForm>({ email: '', role: 'user', password: '' });
    const [submitting, setSubmitting] = useState(false);

    const isCreate = !selectedUser;
    const canSave = useMemo(() => {
        if (!form.email || !form.role) return false;
        if (isCreate) {
            return form.password.length >= 8;
        }
        if (form.password.length > 0 && form.password.length < 8) return false;
        return (
            form.email !== selectedUser.email ||
            form.role !== selectedUser.role ||
            form.password.length >= 8
        );
    }, [form, selectedUser, isCreate]);

    const load = useCallback(
        async (p: number) => {
            setLoading(true);
            try {
                const data = await listUsers(p, limit, filterRole === 'all' ? undefined : filterRole);
                setUsers(data.users);
                setTotal(data.total);
                setTotalPages(data.totalPages);
                setPage(data.page);
            } catch {
                toast({ title: 'Failed to load users', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        },
        [filterRole, limit, toast]
    );

    useEffect(() => {
        void load(1);
    }, [load]);

    useEffect(() => {
        setPage(1);
    }, [limit, filterRole, sortBy, sortOrder]);

    const roleCounts = {
        all: total,
        admin: users.filter((u) => u.role === 'admin').length,
        support: users.filter((u) => u.role === 'support').length,
        user: users.filter((u) => u.role === 'user').length,
    };

    const actor = useAuthStore((s) => s.user);

    const visibleRoles = useMemo(() => {
        if (!actor) return [];
        if (actor.role === 'admin') return ROLES;
        if (actor.role === 'support') return ROLES.filter(r => r.value === 'all' || r.value === 'user');
        return [];
    }, [actor]);

    const canModify = useMemo(
        () => (target: AuthUser) => {
            if (!actor) return false;
            if (actor.role === 'admin') {
                return target.role !== 'admin';
            }
            if (actor.role === 'support') {
                return target.role === 'user';
            }
            return false;
        },
        [actor]
    );
    const canCreate = actor?.role === 'admin' || actor?.role === 'support';
    const canSeeAll = actor?.role === 'admin';
    const canChangeRole = actor?.role === 'admin';

    const openEdit = (user: AuthUser) => {
        setSelectedUser(user);
        setForm({ email: user.email, role: user.role, password: '' });
        setEditOpen(true);
    };

    const openDelete = (user: AuthUser) => {
        setSelectedUser(user);
        setDeleteOpen(true);
    };

    const handleEdit = async () => {
        if (!form.email || !form.role) return;
        setSubmitting(true);
        try {
            if (selectedUser) {
                const payload: { email?: string; role?: AuthUser['role']; password?: string } = {
                    email: form.email !== selectedUser.email ? form.email : undefined,
                    role: form.role !== selectedUser.role ? form.role : undefined,
                };
                if (form.password.length >= 8) {
                    payload.password = form.password;
                }
                if (Object.keys(payload).length === 0) {
                    setEditOpen(false);
                    return;
                }
                const { user } = await updateUser(selectedUser.id, payload);
                setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
                toast({ title: 'User updated' });
            } else {
                if (!form.password || form.password.length < 8) {
                    toast({
                        title: 'Password must be at least 8 characters',
                        variant: 'destructive',
                    });
                    return;
                }
                const { user } = await createUser({
                    email: form.email,
                    role: form.role,
                    password: form.password,
                });
                setUsers((prev) => [user, ...prev]);
                toast({ title: 'User created' });
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
        if (!selectedUser) return;
        setSubmitting(true);
        try {
            await deleteUser(selectedUser.id);
            setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
            toast({ title: 'User deleted' });
            setDeleteOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Delete failed';
            toast({ title: 'Delete failed', description: message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredUsers = search
        ? users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()))
        : users;

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
                        <p className="text-sm text-muted-foreground">{total} accounts total</p>
                    </div>
                    {canCreate && (
                        <Button
                            onClick={() => {
                                setSelectedUser(null);
                                setForm({ email: '', role: 'user', password: '' });
                                setEditOpen(true);
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New User
                        </Button>
                    )}
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    />
                </div>
                {canSeeAll && (
                    <div className="flex gap-1 rounded-lg border bg-background p-1">
                        {visibleRoles.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                onClick={() => setFilterRole(r.value)}
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                    filterRole === r.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {r.label}
                                {r.value !== 'all' && (
                                    <span
                                        className={`text-[10px] ${filterRole === r.value ? 'opacity-70' : 'text-muted-foreground'}`}
                                    >
                                        {roleCounts[r.value as keyof typeof roleCounts] ?? 0}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersIcon className="h-5 w-5 text-primary" />
                        {filterRole === 'all'
                            ? 'All Users'
                            : `${ROLE_LABELS[filterRole as AuthUser['role']]}s`}
                    </CardTitle>
                    <CardDescription>Manage user accounts and roles</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && users.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <>
                            <div className="overflow-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-3 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (sortBy === 'email') {
                                                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                        } else {
                                                            setSortBy('email');
                                                            setSortOrder('asc');
                                                        }
                                                    }}
                                                    className="flex items-center gap-1 hover:text-foreground"
                                                >
                                                    Email
                                                    {sortBy === 'email' && (
                                                        sortOrder === 'asc'
                                                            ? <ChevronUp className="h-3 w-3" />
                                                            : <ChevronDown className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="pb-3 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (sortBy === 'role') {
                                                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                        } else {
                                                            setSortBy('role');
                                                            setSortOrder('asc');
                                                        }
                                                    }}
                                                    className="flex items-center gap-1 hover:text-foreground"
                                                >
                                                    Role
                                                    {sortBy === 'role' && (
                                                        sortOrder === 'asc'
                                                            ? <ChevronUp className="h-3 w-3" />
                                                            : <ChevronDown className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="pb-3 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (sortBy === 'created_at') {
                                                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                        } else {
                                                            setSortBy('created_at');
                                                            setSortOrder('desc');
                                                        }
                                                    }}
                                                    className="flex items-center gap-1 hover:text-foreground"
                                                >
                                                    Created
                                                    {sortBy === 'created_at' && (
                                                        sortOrder === 'asc'
                                                            ? <ChevronUp className="h-3 w-3" />
                                                            : <ChevronDown className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="pb-3 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-accent/20">
                                                <td className="py-3 pr-4 font-mono text-xs">
                                                    {user.email}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <Badge variant={ROLE_COLORS[user.role]}>
                                                        {ROLE_LABELS[user.role]}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-4 text-muted-foreground">
                                                    {formatDate(user.createdAt)}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => openEdit(user)}
                                                            disabled={!canModify(user)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => openDelete(user)}
                                                            disabled={!canModify(user)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="py-6 text-center text-muted-foreground"
                                                >
                                                    No users found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {search && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Showing {users.length} of {total} users
                                </p>
                            )}

                            <div className="mt-4 flex items-center justify-between">
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
                                        onClick={() => void load(page - 1)}
                                        disabled={page <= 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void load(page + 1)}
                                        disabled={page >= totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedUser ? 'Edit User' : 'Create User'}</DialogTitle>
                        <DialogDescription>
                            {selectedUser
                                ? 'Update email, role, or password'
                                : 'Create a new user account'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                                value={form.role}
                                onValueChange={(v) =>
                                    setForm((f) => ({ ...f, role: v as AuthUser['role'] }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    {canChangeRole && <SelectItem value="support">Support</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                placeholder={
                                    selectedUser
                                        ? 'Leave blank to keep current'
                                        : 'At least 8 characters'
                                }
                                value={form.password}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, password: e.target.value }))
                                }
                            />
                            {!selectedUser && (
                                <p className="text-xs text-muted-foreground">Min 8 characters</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit} disabled={submitting || !canSave}>
                            {submitting
                                ? 'Saving...'
                                : selectedUser
                                  ? 'Save Changes'
                                  : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{selectedUser?.email}</strong>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                            {submitting ? 'Deleting...' : 'Delete User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
