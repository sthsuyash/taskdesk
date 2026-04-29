import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
    const hash = pbkdf2Sync(password, salt, 210000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
    const { hash } = hashPassword(password, salt);
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function parseInteger(
    value: unknown,
    fallback: number,
    minimum = 1,
    maximum = Number.MAX_SAFE_INTEGER
) {
    const parsed = Number.parseInt(String(value ?? fallback), 10);
    if (Number.isNaN(parsed)) {
        return fallback;
    }

    return Math.min(maximum, Math.max(minimum, parsed));
}

export function normalizeSortOrder(value: unknown) {
    return String(value).toLowerCase() === 'asc' ? 'asc' : 'desc';
}
