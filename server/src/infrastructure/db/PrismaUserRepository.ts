import { User } from '@/models/user.model';
import { ListUsersOptions, PaginatedResult, UserRepository } from '@/repositories/UserRepository';
import { PrismaClient, User as PrismaUser } from '@prisma/client';

export class PrismaUserRepository implements UserRepository {
    constructor(private readonly prisma: PrismaClient) {}

    private mapToDomain(user: PrismaUser): User {
        return {
            id: user.id,
            email: user.email,
            passwordSalt: user.passwordSalt,
            passwordHash: user.passwordHash,
            roleId: user.roleId,
            createdAt: user.createdAt.getTime(),
            updatedAt: user.updatedAt.getTime(),
        };
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        return user ? this.mapToDomain(user) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        return user ? this.mapToDomain(user) : null;
    }

    async list(options: ListUsersOptions): Promise<PaginatedResult<User>> {
        const { roleId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
        const where: PrismaUserWhereInput = roleId ? { roleId } : {};

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            items: users.map(this.mapToDomain),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async create(data: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
        const user = await this.prisma.user.create({
            data: {
                id: data.id,
                email: data.email,
                passwordSalt: data.passwordSalt,
                passwordHash: data.passwordHash,
                roleId: data.roleId,
            },
        });
        return this.mapToDomain(user);
    }

    async update(
        id: string,
        data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<User> {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                email: data.email,
                passwordSalt: data.passwordSalt,
                passwordHash: data.passwordHash,
                roleId: data.roleId,
            },
        });
        return this.mapToDomain(user);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.task.deleteMany({ where: { userId: id } }),
            this.prisma.sessionEvent.deleteMany({ where: { session: { userId: id } } }),
            this.prisma.session.deleteMany({ where: { userId: id } }),
            this.prisma.authSession.deleteMany({ where: { userId: id } }),
            this.prisma.auditLog.deleteMany({ where: { userId: id } }),
            this.prisma.user.delete({ where: { id } }),
        ]);
    }
}

type PrismaUserWhereInput = {
    roleId?: string;
};
