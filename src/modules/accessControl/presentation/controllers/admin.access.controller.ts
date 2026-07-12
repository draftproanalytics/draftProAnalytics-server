// src/modules/accessControl/presentation/controllers/admin.access.controls.ts
import type { Request, Response } from "express";
import { z } from "zod";

import type { IAccessControlRepository } from "../../domain/repositories/IAccessControlRepository";
import {
  ForbiddenError,
  NotAuthenticatedError,
  NotFoundError,
  ValidationError,
} from "../../domain/access.errors";

import { ListAccessUsersUseCase } from "../../application/usecases/ListAccessUsersUseCase";
import { UpdateUserRolesUseCase } from "../../application/usecases/UpdateUserRolesUseCase";
import { adminGrantRoleSchema, adminRevokeRoleSchema } from "../http/access.schemas";

const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
});

const pidParamSchema = z.object({
  pid: z.coerce.number().int().positive(),
});

const updateRolesBodySchema = z.object({
  roleIds: z.array(z.number().int().positive()).max(50),
});

type UserShape = { sub?: unknown; personId?: unknown; pid?: unknown; id?: unknown; userId?: unknown };

function extractPersonId(req: Request): number {
  const u = (req as unknown as { user?: unknown }).user;
  if (!u || typeof u !== "object") throw new NotAuthenticatedError();

  const o = u as UserShape;
  const candidates: unknown[] = [o.sub, o.personId, o.pid, o.id, o.userId];

  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string") {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
  }
  throw new NotAuthenticatedError();
}

export class AdminAccessController {
  public constructor(
    private readonly listUsersUc: ListAccessUsersUseCase,
    private readonly updateUserRolesUc: UpdateUserRolesUseCase,
    private readonly repo: IAccessControlRepository,
  ) {}

  public listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { search } = listUsersQuerySchema.parse(req.query);
      const result = await this.listUsersUc.execute({ search });
      res.json(result);
    } catch (err: unknown) {
      this.handleError(res, err);
    }
  };

  public updateUserRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pid } = pidParamSchema.parse(req.params);
      const { roleIds } = updateRolesBodySchema.parse(req.body);

      const result = await this.updateUserRolesUc.execute({ pid, roleIds });
      res.json(result);
    } catch (err: unknown) {
      this.handleError(res, err);
    }
  };

  // Admin: POST /admin/access/users/:pid/roles/grant { roleName }
  public grantRoleToPerson = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = extractPersonId(req);
      const { pid } = pidParamSchema.parse(req.params);
      const parsed = adminGrantRoleSchema.parse(req.body);

      const roleName = parsed.roleName.trim();
      const role = await this.repo.getRoleByName(roleName);
      if (!role) throw new NotFoundError(`Role '${roleName}' not found.`);

      await this.repo.grantRoleToPerson(pid, role.rid, adminId);
      res.json({ ok: true });
    } catch (err: unknown) {
      this.handleError(res, err);
    }
  };

  // Admin: POST /admin/access/users/:pid/roles/revoke { roleName }
  public revokeRoleFromPerson = async (req: Request, res: Response): Promise<void> => {
    try {
      extractPersonId(req); // keep: ensures authenticated, even though guard should already do it
      const { pid } = pidParamSchema.parse(req.params);
      const parsed = adminRevokeRoleSchema.parse(req.body);

      const roleName = parsed.roleName.trim();
      const role = await this.repo.getRoleByName(roleName);
      if (!role) throw new NotFoundError(`Role '${roleName}' not found.`);

      await this.repo.revokeRoleFromPerson(pid, role.rid);
      res.json({ ok: true });
    } catch (err: unknown) {
      this.handleError(res, err);
    }
  };

  private handleError(res: Response, err: unknown): void {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: err.errors });
      return;
    }
    if (err instanceof NotAuthenticatedError) {
      res.status(401).json({ error: err.code, message: err.message });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.code, message: err.message });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.code, message: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.code, message: err.message });
      return;
    }

    // eslint-disable-next-line no-console
    console.error("AdminAccessController error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}
