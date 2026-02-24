// src/modules/accessControl/domain/repositories/IAccessPermissionRepository.ts
export interface IAccessPermissionRepository {
  hasRolePermission(roleId: number, domain: string, action: string): Promise<boolean>;
}
