import { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { updateProfile } from '@/services/profileApi';
import type { AuthUser } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ProfileForm {
    email: string;
    password: string;
}

const ROLE_LABELS: Record<AuthUser['role'], string> = {
    admin: 'Admin',
    support: 'Support',
    user: 'User',
};

export default function Profile() {
    const { toast } = useToast();
    const user = useAuthStore((s) => s.user);
    const refresh = useAuthStore((s) => s.refreshUser);
    const [form, setForm] = useState<ProfileForm>({ email: user?.email || '', password: '' });
    const [submitting, setSubmitting] = useState(false);

    const canSave = form.email.length > 0 && (form.password.length >= 8 || form.password.length === 0) && (form.email !== user?.email || form.password.length >= 8);

    const handleSave = async () => {
        if (!user || !form.email) return;
        if (form.password.length > 0 && form.password.length < 8) {
            toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
            return;
        }
        setSubmitting(true);
        try {
            const payload: { email?: string; password?: string } = {};
            if (form.email !== user.email) {
                payload.email = form.email;
            }
            if (form.password.length >= 8) {
                payload.password = form.password;
            }
            if (Object.keys(payload).length === 0) {
                toast({ title: 'No changes to save' });
                return;
            }
            const { user: updated } = await updateProfile(payload);
            await refresh();
            setForm((f) => ({ ...f, password: '' }));
            toast({ title: 'Profile updated' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Update failed';
            toast({ title: 'Update failed', description: message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                        {user.email.split('@')[0].slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
                        <p className="text-sm text-muted-foreground">Manage your account settings</p>
                    </div>
                </div>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-primary" />
                        Account Details
                    </CardTitle>
                    <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        <div className="flex">
                            <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'support' ? 'default' : 'secondary'}>
                                {ROLE_LABELS[user.role]}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Contact admin to change your role</p>
                    </div>
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                            type="password"
                            placeholder="Leave blank to keep current"
                            value={form.password}
                            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">Min 8 characters. Only set if you want to change it.</p>
                    </div>
                    <Button onClick={handleSave} disabled={submitting || !canSave} className="w-full">
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}