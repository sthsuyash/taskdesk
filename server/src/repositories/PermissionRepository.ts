export interface PermissionRepository {
    findByRoleId(roleId: string): Promise<string[]>;
    hasPermission(roleId: string, permission: string): Promise<boolean>;
}
