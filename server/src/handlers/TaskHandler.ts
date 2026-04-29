import { AuthActor } from '@/models/auth.model';
import { TaskStatus } from '@/models/task.model';
import { AuditService } from '@/services/AuditService';
import { TaskService } from '@/services/TaskService';
import { Request, Response } from 'express';

export class TaskHandler {
    constructor(
        private readonly taskService: TaskService,
        private readonly auditService: AuditService
    ) {}

    async listTasks(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const statusId = req.query.statusId as TaskStatus;

        const result = await this.taskService.listTasks(actor, page, limit, statusId);
        res.json(result);
    }

    async createTask(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const task = await this.taskService.createTask(actor, req.body);

        await this.auditService.log({
            userId: actor.id,
            action: 'created',
            entityType: 'Task',
            entityId: task.id,
            details: { title: task.title },
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.status(201).json({ task });
    }

    async updateTask(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const id = String(req.params.id);
        const task = await this.taskService.updateTask(actor, id, req.body);

        await this.auditService.log({
            userId: actor.id,
            action: 'updated',
            entityType: 'Task',
            entityId: task.id,
            details: req.body,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.json({ task });
    }

    async deleteTask(req: Request, res: Response) {
        const actor = req.user as AuthActor;
        const id = String(req.params.id);
        await this.taskService.deleteTask(actor, id);

        await this.auditService.log({
            userId: actor.id,
            action: 'deleted',
            entityType: 'Task',
            entityId: id,
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.headers['user-agent'],
        });

        res.json({ ok: true });
    }
}
