import { ArrowRight, BookOpen, CirclePlay, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5174';
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5175';
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'http://localhost:3000';

const highlights = [
    {
        title: 'Capture Every Customer Journey',
        description: 'Replay complete user sessions with high-fidelity TaskDesk events and page-level timeline context.',
        icon: CirclePlay,
    },
    {
        title: 'Separate Admin Surface',
        description: 'Support operations live in a dedicated dashboard experience with role-gated access.',
        icon: LayoutDashboard,
    },
    {
        title: 'Secure By Default',
        description: 'Cookie-backed auth, scoped access controls, and clean app boundaries across all surfaces.',
        icon: ShieldCheck,
    },
];

export default function App() {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
                <div className="container flex h-16 items-center">
                    <Link to="/" className="text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity">
                        TaskDesk
                    </Link>
                </div>
            </header>

            <main className="flex-1">
                <section className="container py-16 md:py-24">
                    <div className="max-w-3xl mb-16">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                            Understand users before jumping on a call.
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
                            One focused landing, one customer app, one admin console. Keep each surface intentional while sharing a unified identity and event model.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Link to={APP_URL}>
                                <Button size="lg">
                                    Start in App
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link to={DASHBOARD_URL}>
                                <Button size="lg" variant="outline">Dashboard</Button>
                            </Link>
                            <Link to={DOCS_URL}>
                                <Button size="lg" variant="ghost">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    Documentation
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {highlights.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Card key={item.title} className="bg-card/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3 text-lg">
                                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            {item.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-sm">{item.description}</CardDescription>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            </main>

            <footer className="border-t bg-card/50 py-6">
                <div className="container flex items-center justify-between text-sm text-muted-foreground">
                    <p>TaskDesk - Built with rrweb</p>
                    <p className="text-xs">© 2026</p>
                </div>
            </footer>
        </div>
    );
}