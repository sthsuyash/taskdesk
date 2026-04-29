import { AuditHandler } from '@/handlers/AuditHandler';
import { AuthHandler } from '@/handlers/AuthHandler';
import { RoleHandler } from '@/handlers/RoleHandler';
import { SessionHandler } from '@/handlers/SessionHandler';
import { TaskHandler } from '@/handlers/TaskHandler';
import { UserHandler } from '@/handlers/UserHandler';
import { PrismaAuditRepository } from '@/infrastructure/db/PrismaAuditRepository';
import { PrismaAuthRepository } from '@/infrastructure/db/PrismaAuthRepository';
import { PrismaSessionRepository } from '@/infrastructure/db/PrismaSessionRepository';
import { PrismaTaskRepository } from '@/infrastructure/db/PrismaTaskRepository';
import { PrismaUserRepository } from '@/infrastructure/db/PrismaUserRepository';
import { PrismaRoleRepository } from '@/repositories/RoleRepository';
import { AuditService } from '@/services/AuditService';
import { AuthService } from '@/services/AuthService';
import { RoleService } from '@/services/RoleService';
import { SessionService } from '@/services/SessionService';
import { TaskService } from '@/services/TaskService';
import { UserService } from '@/services/UserService';
import { PrismaClient } from '@prisma/client';

export class Container {
    public readonly taskRepository: PrismaTaskRepository;
    public readonly userRepository: PrismaUserRepository;
    public readonly authRepository: PrismaAuthRepository;
    public readonly sessionRepository: PrismaSessionRepository;
    public readonly roleRepository: PrismaRoleRepository;
    public readonly auditRepository: PrismaAuditRepository;

    public readonly taskService: TaskService;
    public readonly userService: UserService;
    public readonly authService: AuthService;
    public readonly sessionService: SessionService;
    public readonly roleService: RoleService;
    public readonly auditService: AuditService;

    public readonly taskHandler: TaskHandler;
    public readonly userHandler: UserHandler;
    public readonly authHandler: AuthHandler;
    public readonly sessionHandler: SessionHandler;
    public readonly roleHandler: RoleHandler;
    public readonly auditHandler: AuditHandler;

    private _broadcast: (sessionId: string, events: unknown[]) => void = () => {};

    constructor(private readonly prisma: PrismaClient) {
        this.taskRepository = new PrismaTaskRepository(this.prisma);
        this.userRepository = new PrismaUserRepository(this.prisma);
        this.authRepository = new PrismaAuthRepository(this.prisma);
        this.sessionRepository = new PrismaSessionRepository(this.prisma);
        this.roleRepository = new PrismaRoleRepository(this.prisma);
        this.auditRepository = new PrismaAuditRepository(this.prisma);

        this.taskService = new TaskService(this.taskRepository, this.userRepository);
        this.userService = new UserService(this.userRepository);
        this.authService = new AuthService(this.authRepository, this.userRepository);
        this.sessionService = new SessionService(this.sessionRepository);
        this.roleService = new RoleService(this.roleRepository);
        this.auditService = new AuditService(this.auditRepository);

        this.taskHandler = new TaskHandler(this.taskService, this.auditService);
        this.userHandler = new UserHandler(this.userService, this.auditService);
        this.authHandler = new AuthHandler(this.authService, this.auditService);
        this.sessionHandler = new SessionHandler(
            this.sessionService,
            this.auditService,
            (sessionId, events) => this._broadcast(sessionId, events)
        );
        this.roleHandler = new RoleHandler(this.roleService);
        this.auditHandler = new AuditHandler(this.auditService);
    }

    public setBroadcast(broadcast: (sessionId: string, events: unknown[]) => void) {
        this._broadcast = broadcast;
    }
}
