import { RoleService } from '@/services/RoleService';
import { Request, Response } from 'express';

export class RoleHandler {
    constructor(private readonly roleService: RoleService) {}

    async listRoles(req: Request, res: Response) {
        const roles = await this.roleService.listRoles();
        res.json({ roles });
    }

    async getRole(req: Request, res: Response) {
        const id = String(req.params.id);
        const role = await this.roleService.getRole(id);
        res.json({ role });
    }
}
