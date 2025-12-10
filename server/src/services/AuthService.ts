import { BadRequestError, ConflictError, UnauthorizedError } from '@/domain/errors/AppError';
import { hashPassword, normalizeEmail, verifyPassword } from '@/lib/utils';
import { AuthUser } from '@/models/auth.model';
import { AuthRepository } from '@/repositories/AuthRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { signAccessToken, signRefreshToken, verifyRefreshToken, decodeToken } from '@/lib/jwt-utils';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly userRepository: UserRepository
    ) {}

    async register(payload: { email: string; password: string; roleId?: string }) {
        const email = normalizeEmail(payload.email);
        const password = payload.password.trim();
        const roleId =
            payload.roleId === 'support' || payload.roleId === 'admin' ? payload.roleId : 'user';

        if (!email) {
            throw new BadRequestError('Email is required');
        }

        if (password.length < 8) {
            throw new BadRequestError('Password must be at least 8 characters');
        }

        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            throw new ConflictError('Email already registered');
        }

        const { salt, hash } = hashPassword(password);
        const user = await this.userRepository.create({
            id: uuidv4(),
            email,
            passwordSalt: salt,
            passwordHash: hash,
            roleId,
        });

        const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            roleId: user.roleId,
            createdAt: user.createdAt.getTime(),
            updatedAt: user.updatedAt.getTime(),
        };

        const accessToken = signAccessToken(authUser);
        const refreshToken = await this.createRefreshToken(user.id);

        return {
            user: authUser,
            accessToken,
            refreshToken,
        };
    }

    async login(payload: { email: string; password: string }) {
        const email = normalizeEmail(payload.email);
        const password = payload.password.trim();

        if (!email || !password) {
            throw new BadRequestError('Email and password are required');
        }

        const user = await this.userRepository.findByEmail(email);
        if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            roleId: user.roleId,
            createdAt: user.createdAt.getTime(),
            updatedAt: user.updatedAt.getTime(),
        };

        await this.authRepository.revokeAllUserRefreshTokens(user.id);

        const accessToken = signAccessToken(authUser);
        const refreshToken = await this.createRefreshToken(user.id);

        return {
            user: authUser,
            accessToken,
            refreshToken,
        };
    }

    async refreshTokens(refreshToken: string) {
        const payload = verifyRefreshToken(refreshToken);
        
        const storedToken = await this.authRepository.findRefreshToken(refreshToken);
        if (!storedToken) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        const user = await this.userRepository.findById(payload.sub);
        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        await this.authRepository.revokeRefreshToken(refreshToken);

        const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            roleId: user.roleId,
            createdAt: user.createdAt.getTime(),
            updatedAt: user.updatedAt.getTime(),
        };

        const newAccessToken = signAccessToken(authUser);
        const newRefreshToken = await this.createRefreshToken(user.id);

        return {
            user: authUser,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }

    async logout(refreshToken?: string) {
        if (refreshToken) {
            await this.authRepository.revokeRefreshToken(refreshToken).catch(() => undefined);
        }
    }

    private async createRefreshToken(userId: string): Promise<string> {
        const jti = uuidv4();
        const token = signRefreshToken(userId, jti);
        
        const decoded = decodeToken(token);
        const expiresAt = new Date((decoded?.exp || 0) * 1000);

        await this.authRepository.createRefreshToken({
            id: uuidv4(),
            userId,
            token,
            expiresAt,
        });

        return token;
    }
}