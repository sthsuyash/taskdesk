import { PermissionRepository } from '@/repositories/PermissionRepository';
import { PrismaClient, Permission as PrismaPermission } from '@prisma/client';

export class PrismaPermissionRepository implements PermissionRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findByRoleId(roleId: string): Promise<string[]> {
        const permissions = await this.prisma.permission.findMany({
            where: { roleId },
            select: { id: true },
        });
        return permissions.map((p) => p.id);
    }

    async hasPermission(roleId: string, permission: string): Promise<boolean> {
        const found = await this.prisma.permission.findUnique({
            where: { id: permission, roleId },
        });
        return !!found;
    }
}
