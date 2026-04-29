import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listAuditLogs } from '@/services/rolesApi';
import { FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: number;
}

function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleString();
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const load = useCallback(async () => {
        try {
            const data = await listAuditLogs(page, limit);
            setLogs(data.items || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        void load();
    }, [load]);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                        <Badge variant="secondary" className="w-fit">
                            Audit Logs
                        </Badge>
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">
                                System Audit Logs
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                Track all user actions and system changes.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => void load()}>
                            Refresh
                        </Button>
                    </div>
                </div>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Activity Log
                    </CardTitle>
                    <CardDescription>
                        Recent actions performed by users in the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No audit logs found</p>
                    ) : (
                        <div className="divide-y">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-start justify-between py-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{log.action}</Badge>
                                            <span className="text-sm font-medium">
                                                {log.entityType}
                                            </span>
                                            {log.entityId && (
                                                <span className="text-xs text-muted-foreground">
                                                    ({log.entityId.slice(0, 8)}...)
                                                </span>
                                            )}
                                        </div>
                                        {log.details && (
                                            <p className="text-xs text-muted-foreground">
                                                {JSON.stringify(log.details).slice(0, 100)}
                                            </p>
                                        )}
                                        {log.ipAddress && (
                                            <p className="text-xs text-muted-foreground">
                                                IP: {log.ipAddress}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        <p>{formatDate(log.createdAt)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t px-3 py-2">
                            <span className="text-xs text-muted-foreground">
                                Showing {logs.length} of {total} logs
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <span className="px-2 text-xs">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
