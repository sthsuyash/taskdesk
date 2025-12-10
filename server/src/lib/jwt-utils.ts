import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { UnauthorizedError } from '@/domain/errors/AppError';
import { AuthUser } from '@/models/auth.model';

export interface AccessTokenPayload {
    sub: string;
    email: string;
    roleId: string;
    iat: number;
    exp: number;
}

export interface RefreshTokenPayload {
    sub: string;
    jti: string;
    iat: number;
    exp: number;
}

export function signAccessToken(user: AuthUser): string {
    return jwt.sign(
        { sub: user.id, email: user.email, roleId: user.roleId },
        env.jwtSecret,
        { expiresIn: env.jwtAccessExpiry, algorithm: 'HS256' }
    );
}

export function signRefreshToken(userId: string, jti: string): string {
    return jwt.sign(
        { sub: userId, jti },
        env.jwtSecret,
        { expiresIn: env.jwtRefreshExpiry, algorithm: 'HS256' }
    );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    try {
        return jwt.verify(token, env.jwtSecret, {
            algorithms: ['HS256'],
        }) as AccessTokenPayload;
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired access token');
    }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
        return jwt.verify(token, env.jwtSecret, {
            algorithms: ['HS256'],
        }) as RefreshTokenPayload;
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }
}

export function decodeToken(token: string): jwt.JwtPayload | null {
    return jwt.decode(token) as jwt.JwtPayload | null;
}

export function extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}