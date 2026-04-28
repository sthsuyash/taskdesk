import { useAuthStore } from '@/store/authStore';
import { env } from '@/config/env';
import { type ReactNode, useEffect } from 'react';

export function AuthInit({ children }: { children: ReactNode }) {
    const refreshUser = useAuthStore((s) => s.refreshUser);

    useEffect(() => {
        void refreshUser().then(() => {
            // If the current session belongs to a support/admin user, redirect to the
            // dashboard app — the UI is intended only for end users.
            try {
                const current = useAuthStore.getState().user;
                if (current && current.role && current.role !== 'user') {
                    window.location.href = env.dashboardUrl;
                }
            } catch {
                // ignore failures — fallback is fine
            }
        });
    }, [refreshUser]);

    return <>{children}</>;
}
