import { useAuthStore } from '@/store/authStore';
import { type ReactNode, useEffect } from 'react';

export function AuthInit({ children }: { children: ReactNode }) {
    const refreshUser = useAuthStore((s) => s.refreshUser);

    useEffect(() => {
        void refreshUser();
    }, [refreshUser]);

    return <>{children}</>;
}
