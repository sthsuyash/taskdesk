import { useAuthStore } from '@/store/authStore';
import { env } from '@/config/env';
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

    // Only allow end-users in the UI. Support and admin users must use the dashboard app.
    if (user.role && user.role !== 'user') {
        // Redirect to the dashboard app (external)
        window.location.href = env.dashboardUrl;
        return null;
    }

    return <>{children}</>;
}
