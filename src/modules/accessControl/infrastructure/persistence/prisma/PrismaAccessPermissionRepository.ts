// src/modules/accessControl/infrastructure/persistence/prisma/PrismaAccessPermissionRepository.ts
import type { PrismaClient } from "@prisma/client";
import type { IAccessPermissionRepository } from "@/modules/accessControl/domain/repositories/IAccessPermissionRepository";

export class PrismaAccessPermissionRepository implements IAccessPermissionRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async hasRolePermission(roleId: number, domain: string, action: string): Promise<boolean> {
    // Adjust column names here if needed:
    // rp.domainCode, pa.actionCode, pa.rolePermissionId
    const rows = await this.prisma.$queryRaw<Array<{ allowed: number }>>`
      SELECT 1 AS allowed
      FROM RolePermission rp
      JOIN PermissionAction pa ON pa.rolePermissionId = rp.id
      WHERE rp.roleId = ${roleId}
        AND rp.domainCode = ${domain}
        AND pa.actionCode = ${action}
      LIMIT 1
    `;
    return rows.length > 0;
  }
}
