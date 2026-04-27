import { ArrowRight, CirclePlay, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

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
        <div className="container py-7 md:py-10">
            <header className="rounded-[1.8rem] border border-border/70 bg-card/80 p-5 shadow-[0_20px_70px_rgba(20,20,20,0.06)] backdrop-blur md:px-7 md:py-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">TaskDesk</p>
                        <p className="mt-1 text-lg font-semibold tracking-tight">Task Management with Session Replay</p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="http://localhost:5174">
                            <Button variant="outline">Open App</Button>
                        </Link>
                        <Link to="http://localhost:5175">
                            <Button>Support Dashboard</Button>
                        </Link>
                    </div>
                </div>
            </header>

            <section className="grid gap-5 pb-6 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
                <Card className="bg-card/80 backdrop-blur">
                    <CardHeader className="space-y-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">for support-driven products</p>
                        <CardTitle className="max-w-[15ch] text-4xl leading-tight md:text-6xl">Understand users before jumping on a call.</CardTitle>
                        <CardDescription className="max-w-[58ch] text-base leading-8">
                            One focused landing, one customer app, one admin console. Keep each surface intentional while sharing a unified identity and event model.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                        <Link to="http://localhost:5174">
                            <Button size="lg">
                                Start in App
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link to="http://localhost:5175">
                            <Button size="lg" variant="outline">Go to Support Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {highlights.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Card key={item.title} className="bg-card/75 backdrop-blur">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-xl">
                                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-sm leading-7">{item.description}</CardDescription>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}