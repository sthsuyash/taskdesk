import { useAuthStore } from '@/store/authStore';
import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);
    const loading = useAuthStore((s) => s.loading);
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <p className="text-sm text-muted-foreground">Checking session...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <>{children}</>;
}
