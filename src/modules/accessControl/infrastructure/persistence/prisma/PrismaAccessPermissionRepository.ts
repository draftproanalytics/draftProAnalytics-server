// src/modules/accessControl/infrastructure/persistence/prisma/PrismaAccessPermissionRepository.ts
import type { PrismaClient } from "@prisma/client";
import type { IAccessPermissionRepository } from "@/modules/accessControl/domain/repositories/IAccessPermissionRepository";

export class PrismaAccessPermissionRepository implements IAccessPermissionRepository {
  public constructor(private readonly prisma: PrismaClient) {}


  public async hasRolePermission(
  roleId: number,
  domain: string,
  action: string
): Promise<boolean> {
  const rows = await this.prisma.$queryRaw<Array<{ allowed: number }>>`
    SELECT 1 AS allowed
    FROM RolePermission rp
    JOIN FeatureDomain fd
      ON fd.domainId = rp.domainId
    JOIN PermissionAction pa
      ON pa.actionId = rp.actionId
    WHERE rp.roleId = ${roleId}
      AND fd.domainCode = ${domain}
      AND pa.actionCode = ${action}
      AND rp.isAllowed = 1
    LIMIT 1
  `;

  return rows.length > 0;
}
}
