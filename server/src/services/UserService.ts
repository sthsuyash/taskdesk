import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from '@/domain/errors/AppError';
import { hashPassword, normalizeEmail } from '@/lib/utils';
import { AuthActor } from '@/models/auth.model';
import { UserRepository } from '@/repositories/UserRepository';
import { v4 as uuidv4 } from 'uuid';

const ROLE_LEVELS: Record<string, number> = {
    admin: 100,
    support: 50,
    user: 1,
};

export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async listUsers(
        actor: AuthActor,
        page?: number,
        limit?: number,
        roleId?: string,
        sortBy?: string,
        sortOrder?: 'asc' | 'desc'
    ) {
        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;
        if (actorLevel < 50) {
            throw new ForbiddenError();
        }
        return this.userRepository.list({ page, limit, roleId, sortBy, sortOrder });
    }

    async createUser(
        actor: AuthActor,
        payload: { email: string; password: string; roleId: string }
    ) {
        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;
        if (actorLevel < 100) {
            throw new ForbiddenError();
        }

        const email = normalizeEmail(payload.email);
        if (!email) {
            throw new BadRequestError('Email is required');
        }

        if (payload.password.length < 8) {
            throw new BadRequestError('Password must be at least 8 characters');
        }

        const existing = await this.userRepository.findByEmail(email);
        if (existing) {
            throw new ConflictError('Email already in use');
        }

        const { salt, hash } = hashPassword(payload.password);
        return this.userRepository.create({
            id: uuidv4(),
            email,
            passwordSalt: salt,
            passwordHash: hash,
            roleId: payload.roleId,
        });
    }

    async updateUser(
        actor: AuthActor,
        id: string,
        payload: { email?: string; roleId?: string; password?: string }
    ) {
        const existing = await this.userRepository.findById(id);
        if (!existing) {
            throw new NotFoundError('User not found');
        }

        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;
        const targetLevel = ROLE_LEVELS[existing.roleId] || 0;

        if (actorLevel < 100 && targetLevel >= 100) {
            throw new ForbiddenError();
        }

        const email = payload.email ? normalizeEmail(payload.email) : existing.email;
        if (payload.email && email !== existing.email) {
            const emailCheck = await this.userRepository.findByEmail(email);
            if (emailCheck) {
                throw new ConflictError('Email already in use');
            }
        }

        if (payload.password && payload.password.length < 8) {
            throw new BadRequestError('Password must be at least 8 characters');
        }

        const updateData: Partial<{
            email: string;
            roleId: string;
            passwordSalt: string;
            passwordHash: string;
        }> = { email };

        if (actorLevel >= 100 && payload.roleId) {
            updateData.roleId = payload.roleId;
        }

        if (payload.password) {
            const { salt, hash } = hashPassword(payload.password);
            updateData.passwordSalt = salt;
            updateData.passwordHash = hash;
        }

        return this.userRepository.update(id, updateData);
    }

    async deleteUser(actor: AuthActor, id: string) {
        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;
        if (actorLevel < 100) {
            throw new ForbiddenError();
        }

        if (actor.id === id) {
            throw new BadRequestError('Cannot delete yourself');
        }

        const existing = await this.userRepository.findById(id);
        if (!existing) {
            throw new NotFoundError('User not found');
        }

        await this.userRepository.delete(id);
    }
}
