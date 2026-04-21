import { type PropsWithChildren, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppShell({ children }: PropsWithChildren) {
    const navigate = useNavigate();

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                navigate('/?action=new');
            }

            if (event.altKey && event.key.toLowerCase() === 'd') {
                event.preventDefault();
                navigate('/dashboard');
            }

        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [navigate]);

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
                <div className="container flex h-16 items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">rrweb task suite</p>
                        <h1 className="text-base font-semibold tracking-tight">Task Desk</h1>
                    </div>
                    <nav className="hidden items-center gap-2 rounded-lg border bg-background p-1 md:flex">
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) =>
                                cn(
                                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                                    isActive && 'bg-primary text-primary-foreground hover:text-primary-foreground',
                                )
                            }
                        >
                            <ListTodo className="h-4 w-4" />
                            Home
                        </NavLink>
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                cn(
                                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                                    isActive && 'bg-primary text-primary-foreground hover:text-primary-foreground',
                                )
                            }
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                        </NavLink>
                    </nav>
                </div>
            </header>
            <main className="container py-6">{children}</main>
        </div>
    );
}
