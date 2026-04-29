import { NotFoundError } from '@/domain/errors/AppError';
import { RoleRepository } from '@/repositories/RoleRepository';

export class RoleService {
    constructor(private readonly roleRepository: RoleRepository) {}

    async listRoles() {
        return this.roleRepository.list();
    }

    async getRole(id: string) {
        const role = await this.roleRepository.findById(id);
        if (!role) {
            throw new NotFoundError('Role not found');
        }
        return role;
    }
}
