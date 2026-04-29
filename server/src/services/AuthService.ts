import { BadRequestError, ConflictError, UnauthorizedError } from '@/domain/errors/AppError';
import { hashPassword, normalizeEmail, verifyPassword } from '@/lib/utils';
import { AuthActor, AuthUser } from '@/models/auth.model';
import { AuthRepository } from '@/repositories/AuthRepository';
import { UserRepository } from '@/repositories/UserRepository';
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

        return {
            id: user.id,
            email: user.email,
            roleId: user.roleId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
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

        return {
            id: user.id,
            email: user.email,
            roleId: user.roleId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    async createSession(userId: string) {
        const sessionToken = uuidv4();
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

        await this.authRepository.createSession({
            id: sessionToken,
            userId,
            expiresAt,
        });

        return sessionToken;
    }

    async getSession(sessionToken: string): Promise<AuthUser | null> {
        const session = await this.authRepository.findSessionById(sessionToken);

        if (!session) {
            return null;
        }

        if (session.expiresAt < Date.now()) {
            await this.authRepository.deleteSession(sessionToken).catch(() => undefined);
            return null;
        }

        await this.authRepository.updateSessionLastSeen(sessionToken, Date.now());

        return session.user;
    }

    async logout(sessionToken: string) {
        await this.authRepository.deleteSession(sessionToken).catch(() => undefined);
    }
}
