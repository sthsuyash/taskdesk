import { type FormEvent, type ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        try {
            await login({ email, password });
            toast({ title: 'Welcome back' });
            navigate('/dashboard');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            toast({ title: 'Login failed', description: message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Support Dashboard</CardTitle>
                    <CardDescription>Sign in to access session replay and live co-browsing</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="support@example.com"
                                value={email}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}