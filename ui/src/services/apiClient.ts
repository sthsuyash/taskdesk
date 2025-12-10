import { env } from '@/config/env';

const ACCESS_TOKEN_KEY = 'taskdesk_access_token';
const REFRESH_TOKEN_KEY = 'taskdesk_refresh_token';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
    if (!accessToken) {
        accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return accessToken;
}

export function setAccessToken(token: string | null) {
    accessToken = token;
    if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
}

export function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null) {
    if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
}

export function clearTokens() {
    accessToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${env.apiUrl}${path}`;
    const token = getAccessToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        headers,
        ...options,
    });

    if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
            const body = (await response.json()) as { error?: string };
            if (body?.error) {
                message = body.error;
            }
        } catch {
            // Keep fallback message when response body is not JSON.
        }
        throw new Error(message);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json() as Promise<T>;
}

export const apiClient = {
    get<T>(path: string) {
        return request<T>(path);
    },
    post<T>(path: string, body: unknown) {
        return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
    },
    put<T>(path: string, body: unknown) {
        return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
    },
    delete<T>(path: string) {
        return request<T>(path, { method: 'DELETE' });
    },
};