import { env } from '@/config/env';
import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

const prismaClient =
    globalThis.prisma ??
    new PrismaClient({
        datasources: {
            db: {
                url: env.databaseUrl,
            },
        },
    });

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prismaClient;
}

export const prisma = prismaClient;

export async function disconnectPrisma() {
    await prisma.$disconnect();
}
