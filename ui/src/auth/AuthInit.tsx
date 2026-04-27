import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

export function AuthInit({ children }: { children: ReactNode }) {
    const refreshUser = useAuthStore((s) => s.refreshUser);

    useEffect(() => {
        void refreshUser();
    }, [refreshUser]);

    return <>{children}</>;
}