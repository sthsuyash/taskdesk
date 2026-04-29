import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listRoles } from '@/services/rolesApi';
import { Shield } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Role {
    id: string;
    name: string;
    description: string | null;
    level: number;
}

export default function Roles() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await listRoles();
            setRoles(data.roles || []);
        } catch (err) {
            console.error('Failed to load roles:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <Badge variant="secondary" className="w-fit">
                            Roles
                        </Badge>
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">
                                Role Management
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                View all roles and their permission levels in the system.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        System Roles
                    </CardTitle>
                    <CardDescription>
                        All roles defined in the system with their hierarchy levels
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : roles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No roles found</p>
                    ) : (
                        <div className="divide-y">
                            {roles.map((role) => (
                                <div
                                    key={role.id}
                                    className="flex items-center justify-between py-4"
                                >
                                    <div className="space-y-1">
                                        <p className="font-medium">{role.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {role.description || 'No description'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">Level {role.level}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
