import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
    ChevronDown,
    LayoutDashboard,
    ListTodo,
    LogOut,
    RadioTower,
    User,
    Users,
} from 'lucide-react';
import { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function UserMenu({
    user,
    onLogout,
}: {
    user: { email: string; role: string; id: string };
    onLogout: () => void;
}) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const initials = user.email.split('@')[0].slice(0, 2).toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5 transition-colors hover:bg-accent"
            >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {initials}
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
            {open && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border bg-background p-1 shadow-md">
                    <div className="border-b px-3 py-2">
                        <p className="text-sm font-medium truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            navigate('/profile');
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <User className="h-4 w-4" />
                        Profile
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            onLogout();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}

export default function AppShell({ children }: PropsWithChildren) {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
                <div className="container flex h-16 items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            TaskDesk support ops
                        </p>
                        <h1 className="text-base font-semibold tracking-tight">Admin Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <nav className="hidden items-center gap-2 rounded-lg border bg-background p-1 md:flex">
                            <NavLink
                                to="/dashboard"
                                className={({ isActive }) =>
                                    cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                                        isActive &&
                                            'bg-primary text-primary-foreground hover:text-primary-foreground'
                                    )
                                }
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                Replay
                            </NavLink>
                            <NavLink
                                to="/live"
                                className={({ isActive }) =>
                                    cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                                        isActive &&
                                            'bg-primary text-primary-foreground hover:text-primary-foreground'
                                    )
                                }
                            >
                                <RadioTower className="h-4 w-4" />
                                Live
                            </NavLink>
                            <NavLink
                                to="/tasks"
                                className={({ isActive }) =>
                                    cn(
                                        'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                                        isActive &&
                                            'bg-primary text-primary-foreground hover:text-primary-foreground'
                                    )
                                }
                            >
                                <ListTodo className="h-4 w-4" />
                                Tasks
                            </NavLink>
                            {(user?.role === 'admin' || user?.role === 'support') && (
                                <NavLink
                                    to="/users"
                                    className={({ isActive }) =>
                                        cn(
                                            'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                                            isActive &&
                                                'bg-primary text-primary-foreground hover:text-primary-foreground'
                                        )
                                    }
                                >
                                    <Users className="h-4 w-4" />
                                    Users
                                </NavLink>
                            )}
                        </nav>
                        {user && <UserMenu user={user} onLogout={handleLogout} />}
                    </div>
                </div>
            </header>
            <main className="container py-6">{children}</main>
        </div>
    );
}
