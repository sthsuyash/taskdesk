import type { Request, Response } from 'express';
import { env } from './config/env.js';
import type { Store } from './db/store.js';

export function parseCookies(rawCookieHeader?: string) {
    return (rawCookieHeader || '')
        .split(';')
        .reduce<Record<string, string>>((accumulator, chunk) => {
            const separatorIndex = chunk.indexOf('=');
            if (separatorIndex === -1) {
                return accumulator;
            }

            const key = chunk.slice(0, separatorIndex).trim();
            const value = chunk.slice(separatorIndex + 1).trim();
            if (key) {
                accumulator[key] = decodeURIComponent(value);
            }
            return accumulator;
        }, {});
}

export function getAuthTokenFromRequest(req: Request) {
    return parseCookies(req.headers.cookie)[env.authCookieName] || null;
}

export async function getCurrentUserFromRequest(req: Request, store: Store) {
    const token = getAuthTokenFromRequest(req);
    if (!token) {
        return null;
    }

    return store.getAuthSession(token);
}

export async function getCurrentUserFromCookieHeader(
    cookieHeader: string | undefined,
    store: Store
) {
    const token = parseCookies(cookieHeader)[env.authCookieName] || null;
    if (!token) {
        return null;
    }

    return store.getAuthSession(token);
}

export function setAuthCookie(res: Response, token: string) {
    const parts = [
        `${env.authCookieName}=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=604800',
    ];

    if (env.authCookieSecure) {
        parts.push('Secure');
    }

    res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearAuthCookie(res: Response) {
    const parts = [`${env.authCookieName}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];

    if (env.authCookieSecure) {
        parts.push('Secure');
    }

    res.setHeader('Set-Cookie', parts.join('; '));
}
