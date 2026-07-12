import type { PrismaClient } from "@prisma/client";

import type { IAdminAccessRepository } from "../../../domain/repositories/IAdminAccessRepository";
import type {
  AdminRoleDto,
  AdminUserDto,
} from "../../../application/dtos/AdminAccess.dto";

const PUBLIC_RID = 1;

export class PrismaAdminAccessRepository implements IAdminAccessRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listRoles(): Promise<AdminRoleDto[]> {
    const roles = await this.prisma.roles.findMany({
      where: { isActive: true },
      select: {
        rid: true,
        roleName: true,
      },
      orderBy: {
        rid: "asc",
      },
    });

    return roles;
  }

  public async searchUsers(search: string): Promise<AdminUserDto[]> {
    const s = search.trim();

    const where =
      s.length === 0
        ? undefined
        : {
            OR: [
              { userName: { contains: s } },
              { emailAddress: { contains: s } },
              { firstName: { contains: s } },
              { lastName: { contains: s } },
            ],
          };

    const people = await this.prisma.person.findMany({
      where,
      select: {
        pid: true,
        userName: true,
        emailAddress: true,
        firstName: true,
        lastName: true,
        isActive: true,
        activeRid: true,
        PersonRole_PersonRole_personIdToPerson: {
          where: {
            isActive: true,
            revokedAt: null,
          },
          select: {
            Roles: {
              select: {
                rid: true,
                roleName: true,
              },
            },
          },
          orderBy: {
            roleId: "asc",
          },
        },
      },
      orderBy: {
        pid: "asc",
      },
      take: 200,
    });

    return people.map(p => this.toDto(p));
  }

  public async getUserByPid(pid: number): Promise<AdminUserDto> {
    const p = await this.prisma.person.findUnique({
      where: { pid },
      select: {
        pid: true,
        userName: true,
        emailAddress: true,
        firstName: true,
        lastName: true,
        isActive: true,
        activeRid: true,
        PersonRole_PersonRole_personIdToPerson: {
          where: {
            isActive: true,
            revokedAt: null,
          },
          select: {
            Roles: {
              select: {
                rid: true,
                roleName: true,
              },
            },
          },
          orderBy: {
            roleId: "asc",
          },
        },
      },
    });

    if (!p) {
      throw new Error(`Person not found: ${pid}`);
    }

    return this.toDto(p);
  }

  public async setUserRoles(pid: number, roleIds: number[]): Promise<void> {
    const uniqueRoleIds = Array.from(new Set(roleIds));

    // Always keep public. This prevents a user from having no valid role.
    if (!uniqueRoleIds.includes(PUBLIC_RID)) {
      uniqueRoleIds.push(PUBLIC_RID);
    }

    uniqueRoleIds.sort((a, b) => a - b);

    await this.prisma.$transaction(async tx => {
      const person = await tx.person.findUnique({
        where: { pid },
        select: { activeRid: true },
      });

      if (!person) {
        throw new Error(`Person not found: ${pid}`);
      }

      await tx.personRole.deleteMany({
        where: { personId: pid },
      });

      await tx.personRole.createMany({
        data: uniqueRoleIds.map(roleId => ({
          personId: pid,
          roleId,
          assignedByPersonId: null,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      const nextActiveRid =
        person.activeRid && uniqueRoleIds.includes(person.activeRid)
          ? person.activeRid
          : PUBLIC_RID;

      await tx.person.update({
        where: { pid },
        data: {
          activeRid: nextActiveRid,
        },
      });
    });
  }

  private toDto(p: {
    pid: number;
    userName: string;
    emailAddress: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean | null;
    activeRid: number | null;
    PersonRole_PersonRole_personIdToPerson: Array<{
      Roles: {
        rid: number;
        roleName: string;
      };
    }>;
  }): AdminUserDto {
    const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();

    return {
      pid: p.pid,
      userName: p.userName,
      emailAddress: p.emailAddress,
      fullName,
      isActive: Boolean(p.isActive),
      roles: p.PersonRole_PersonRole_personIdToPerson.map(row => row.Roles),
    };
  }
}