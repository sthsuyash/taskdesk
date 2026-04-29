import { env } from '@/config/env';

const TOKEN_KEY = 'taskdesk_token';

export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${env.apiUrl}${path}`;
    const authToken = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
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
