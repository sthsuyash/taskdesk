import { hashPassword, normalizeEmail } from '@/lib/utils';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { seedLookupTables } from './seedLookup';

interface BootstrapConfig {
    bootstrapAdmin?: {
        email: string;
        password: string;
    };
    bootstrapSupport?: {
        email: string;
        password: string;
    };
}

export async function seedBootstrapUsers(prismaClient: PrismaClient, config: BootstrapConfig = {}) {
    let defaultOwnerUserId = '';

    await seedLookupTables(prismaClient);

    const bootstrapAdmin = config.bootstrapAdmin;
    if (bootstrapAdmin?.email && bootstrapAdmin.password.trim()) {
        const email = normalizeEmail(bootstrapAdmin.email);
        const password = bootstrapAdmin.password.trim();
        const existingAdmin = await prismaClient.user.findUnique({ where: { email } });

        if (existingAdmin) {
            await prismaClient.user.update({
                where: { id: existingAdmin.id },
                data: { roleId: 'admin' },
            });
            defaultOwnerUserId = existingAdmin.id;
        } else {
            const { salt, hash } = hashPassword(password);
            const admin = await prismaClient.user.create({
                data: {
                    id: uuidv4(),
                    email,
                    passwordSalt: salt,
                    passwordHash: hash,
                    roleId: 'admin',
                },
            });
            defaultOwnerUserId = admin.id;
        }

        if (defaultOwnerUserId) {
            await prismaClient.session.updateMany({
                where: { OR: [{ userId: null }, { userId: '' }] },
                data: { userId: defaultOwnerUserId },
            });

            await prismaClient.task.updateMany({
                where: { OR: [{ userId: null }, { userId: '' }] },
                data: { userId: defaultOwnerUserId },
            });
        }
    }

    const bootstrapSupport = config.bootstrapSupport;
    if (bootstrapSupport?.email && bootstrapSupport.password.trim()) {
        const email = normalizeEmail(bootstrapSupport.email);
        const password = bootstrapSupport.password.trim();
        const existingSupport = await prismaClient.user.findUnique({ where: { email } });

        if (existingSupport) {
            await prismaClient.user.update({
                where: { id: existingSupport.id },
                data: { roleId: 'support' },
            });
        } else {
            const { salt, hash } = hashPassword(password);
            await prismaClient.user.create({
                data: {
                    id: uuidv4(),
                    email,
                    passwordSalt: salt,
                    passwordHash: hash,
                    roleId: 'support',
                },
            });
        }
    }

    return { defaultOwnerUserId };
}
