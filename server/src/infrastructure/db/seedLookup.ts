import { PrismaClient } from '@prisma/client';

const DEFAULT_PERMISSIONS = {
    admin: [
        'task:create',
        'task:read',
        'task:update',
        'task:delete',
        'user:create',
        'user:read',
        'user:update',
        'user:delete',
        'session:read',
        'session:read_all',
        'session:delete',
        'audit:read',
    ],
    support: [
        'task:create',
        'task:read',
        'task:update',
        'user:read',
        'session:read',
        'session:read_all',
    ],
    user: ['task:create', 'task:read', 'task:update', 'task:delete_own'],
};

export async function seedLookupTables(prisma: PrismaClient) {
    const roles = [
        { id: 'admin', name: 'Admin', description: 'Full system access', level: 100 },
        { id: 'support', name: 'Support', description: 'Support staff access', level: 50 },
        { id: 'user', name: 'User', description: 'Regular user access', level: 1 },
    ];

    const taskStatuses = [
        { id: 'todo', name: 'To Do' },
        { id: 'in_progress', name: 'In Progress' },
        { id: 'done', name: 'Done' },
        { id: 'blocked', name: 'Blocked' },
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: { id: role.id },
            update: { name: role.name, description: role.description, level: role.level },
            create: role,
        });
    }

    for (const status of taskStatuses) {
        await prisma.taskStatus.upsert({
            where: { id: status.id },
            update: { name: status.name },
            create: status,
        });
    }

    for (const [roleId, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
        for (const permName of permissions) {
            await prisma.permission.upsert({
                where: { id: permName },
                update: { roleId },
                create: { id: permName, name: permName, roleId },
            });
        }
    }

    console.log('[Seed] Lookup tables seeded');
}
