import { Task, TaskStatus } from '@/models/task.model';
import { ListTasksOptions, PaginatedResult, TaskRepository } from '@/repositories/TaskRepository';
import { PrismaClient, Task as PrismaTask } from '@prisma/client';

export class PrismaTaskRepository implements TaskRepository {
    constructor(private readonly prisma: PrismaClient) {}

    private mapToDomain(task: PrismaTask): Task {
        return {
            id: task.id,
            title: task.title,
            description: task.description,
            statusId: task.statusId as TaskStatus,
            createdAt: task.createdAt.getTime(),
            updatedAt: task.updatedAt.getTime(),
            userId: task.userId ?? '',
        };
    }

    async findById(id: string): Promise<Task | null> {
        const task = await this.prisma.task.findUnique({ where: { id } });
        return task ? this.mapToDomain(task) : null;
    }

    async list(options: ListTasksOptions): Promise<PaginatedResult<Task>> {
        const { userId, statusId, page = 1, limit = 20 } = options;
        const where: PrismaTaskWhereInput = {};
        if (userId) where.userId = userId;
        if (statusId) where.statusId = statusId;

        const [tasks, total] = await Promise.all([
            this.prisma.task.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            items: tasks.map(this.mapToDomain),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async create(
        data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): Promise<Task> {
        const task = await this.prisma.task.create({
            data: {
                id: data.id,
                title: data.title,
                description: data.description,
                statusId: data.statusId,
                userId: data.userId || null,
            },
        });
        return this.mapToDomain(task);
    }

    async update(
        id: string,
        data: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<Task> {
        const task = await this.prisma.task.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                statusId: data.statusId,
            },
        });
        return this.mapToDomain(task);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.task.delete({ where: { id } });
    }
}

type PrismaTaskWhereInput = {
    userId?: string;
    statusId?: string;
};
