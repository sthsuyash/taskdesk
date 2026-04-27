import { create } from 'zustand';
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '@/services/authApi';
import type { AuthUser, LoginPayload, RegisterPayload } from '@/types';

interface AuthState {
    user: AuthUser | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    login: (payload: LoginPayload) => Promise<AuthUser>;
    register: (payload: RegisterPayload) => Promise<AuthUser>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
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
        set({ user: response.user });
        return response.user;
    },

    register: async (payload: RegisterPayload) => {
        const response = await registerRequest(payload);
        set({ user: response.user });
        return response.user;
    },

    logout: async () => {
        try {
            await logoutRequest();
        } finally {
            set({ user: null });
        }
    },
}));