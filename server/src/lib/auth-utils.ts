import { env } from '@/config/env';
import { Request, Response } from 'express';

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
    const authHeader = req.headers.authorization;
    console.log('[Auth] Authorization header:', authHeader);
    console.log('[Auth] Cookie header:', req.headers.cookie);
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return parseCookies(req.headers.cookie)[env.authCookieName] || null;
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
