import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);
    const loading = useAuthStore((s) => s.loading);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-sm text-muted-foreground">Checking permissions...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'admin' && user.role !== 'support') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
