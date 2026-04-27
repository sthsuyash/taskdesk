import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '@/services/authApi';
import type { AuthUser, LoginPayload, RegisterPayload } from '@/types';

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    refreshUser: () => Promise<AuthUser | null>;
    login: (payload: LoginPayload) => Promise<AuthUser>;
    register: (payload: RegisterPayload) => Promise<AuthUser>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const response = await getCurrentUser();
            setUser(response.user);
            return response.user;
        } catch {
            setUser(null);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const login = async (payload: LoginPayload) => {
        const response = await loginRequest(payload);
        setUser(response.user);
        return response.user;
    };

    const register = async (payload: RegisterPayload) => {
        const response = await registerRequest(payload);
        setUser(response.user);
        return response.user;
    };

    const logout = async () => {
        try {
            await logoutRequest();
        } finally {
            setUser(null);
        }
    };

    useEffect(() => {
        void refreshUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}