import { BadRequestError, ForbiddenError, NotFoundError } from '@/domain/errors/AppError';
import { AuthActor } from '@/models/auth.model';
import { Task, TaskPayload, TaskStatus } from '@/models/task.model';
import { TaskRepository } from '@/repositories/TaskRepository';
import { UserRepository } from '@/repositories/UserRepository';
import { v4 as uuidv4 } from 'uuid';

const ROLE_LEVELS: Record<string, number> = {
    admin: 100,
    support: 50,
    user: 1,
};

export class TaskService {
    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly userRepository: UserRepository
    ) {}

    async listTasks(actor: AuthActor, page?: number, limit?: number, statusId?: TaskStatus) {
        const canReadAll = ROLE_LEVELS[actor.roleId] >= 50;
        const userId = canReadAll ? undefined : actor.id;
        return this.taskRepository.list({ userId, statusId, page, limit });
    }

    async createTask(actor: AuthActor, payload: TaskPayload) {
        if (!payload.title) {
            throw new BadRequestError('Title is required');
        }

        return this.taskRepository.create({
            id: uuidv4(),
            title: payload.title.trim(),
            description: payload.description?.trim() || '',
            statusId: payload.statusId || 'todo',
            userId: actor.id,
        });
    }

    async updateTask(actor: AuthActor, id: string, payload: TaskPayload) {
        const task = await this.getTaskAndCheckPermission(actor, id);

        return this.taskRepository.update(id, {
            title: payload.title?.trim(),
            description: payload.description?.trim(),
            statusId: payload.statusId,
        });
    }

    async deleteTask(actor: AuthActor, id: string) {
        await this.getTaskAndCheckPermission(actor, id);
        await this.taskRepository.delete(id);
    }

    private async getTaskAndCheckPermission(actor: AuthActor, id: string): Promise<Task> {
        const task = await this.taskRepository.findById(id);
        if (!task) {
            throw new NotFoundError('Task not found');
        }

        const actorLevel = ROLE_LEVELS[actor.roleId] || 0;

        if (actorLevel >= 100) {
            return task;
        }

        const owner = await this.userRepository.findById(task.userId);
        const ownerLevel = ROLE_LEVELS[owner?.roleId || ''] || 0;

        if (actorLevel >= 50) {
            if (ownerLevel >= 50) {
                throw new ForbiddenError('You do not have permission to manage this task');
            }
            return task;
        }

        if (task.userId !== actor.id) {
            throw new ForbiddenError('You do not have permission to manage this task');
        }

        return task;
    }
}
