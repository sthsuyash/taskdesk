import { PrismaClient, Role } from '@prisma/client';

export interface RoleRepository {
    list(): Promise<Role[]>;
    findById(id: string): Promise<Role | null>;
}

export class PrismaRoleRepository implements RoleRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async list(): Promise<Role[]> {
        return this.prisma.role.findMany({
            orderBy: { level: 'desc' },
        });
    }

    async findById(id: string): Promise<Role | null> {
        return this.prisma.role.findUnique({
            where: { id },
            include: { permissions: true },
        });
    }
}
