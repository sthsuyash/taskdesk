import { setAuthToken } from '@/services/apiClient';
import {
    getCurrentUser,
    login as loginRequest,
    logout as logoutRequest,
    register as registerRequest,
} from '@/services/authApi';
import type { AuthUser, LoginPayload, RegisterPayload } from '@/types';
import { create } from 'zustand';

interface AuthState {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    login: (payload: LoginPayload) => Promise<AuthUser>;
    register: (payload: RegisterPayload) => Promise<AuthUser>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    loading: true,

    refreshUser: async () => {
        try {
            const response = await getCurrentUser();
            set({ user: response.user, loading: false });
        } catch {
            set({ user: null, loading: false });
        }
    },

    login: async (payload: LoginPayload) => {
        const response = await loginRequest(payload);
        setAuthToken(response.token);
        set({ user: response.user, token: response.token });
        return response.user;
    },

    register: async (payload: RegisterPayload) => {
        const response = await registerRequest(payload);
        setAuthToken(response.token);
        set({ user: response.user, token: response.token });
        return response.user;
    },

    logout: async () => {
        try {
            await logoutRequest();
        } finally {
            setAuthToken(null);
            set({ user: null, token: null });
        }
    },
}));
