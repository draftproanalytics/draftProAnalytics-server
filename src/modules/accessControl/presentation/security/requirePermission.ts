// src/modules/accessControl/presentation/security/requirePermission.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { PrismaClient } from "@prisma/client";
import { PrismaAccessPermissionRepository } from "@/modules/accessControl/infrastructure/persistence/prisma/PrismaAccessPermissionRepository";

type RoleCarrier = {
  roleId?: number;
  rid?: number;
  activeRoleId?: number;
  activeRid?: number;
};
type Deps = { permissionRepo: IAccessPermissionRepository; };

export type RequirePermission = (domain: string, action: string) => RequestHandler;


export function createRequirePermission(deps: Deps): RequirePermission {
  return (domain: string, action: string): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const rid = req.user?.activeRid;

      if (typeof rid !== "number") {
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      const allowed = await deps.permissionRepo.hasRolePermission(rid, domain, action);

      if (!allowed) {
        res.status(403).json({
          ok: false,
          error: "Forbidden",
          required: { domain, action },
        });
        return;
      }

      next();
    };
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getActiveRoleId(req: Request): number | null {
  // Try common patterns: req.user, req.auth, res.locals.user (via middleware)
  const candidates: unknown[] = [
    (req as unknown as { user?: unknown }).user,
    (req as unknown as { auth?: unknown }).auth,
    (req.res?.locals as unknown),
  ];

  for (const c of candidates) {
    if (!isRecord(c)) continue;
    const carrier = c as RoleCarrier;

    const active = carrier.activeRoleId ?? carrier.activeRid;
    if (typeof active === "number") return active;

    const base = carrier.roleId ?? carrier.rid;
    if (typeof base === "number") return base;
  }

  return null;
}

export function requirePermission(
  prisma: PrismaClient,
  domain: string,
  action: string
): RequestHandler {
  const repo = new PrismaAccessPermissionRepository(prisma);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roleId = getActiveRoleId(req);

    if (roleId === null) {
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    const allowed = await repo.hasRolePermission(roleId, domain, action);
    if (!allowed) {
      res.status(403).json({
        ok: false,
        error: "Forbidden",
        required: { domain, action },
      });
      return;
    }

    next();
  };
}




import type { IAccessPermissionRepository } from "@/modules/accessControl/domain/repositories/IAccessPermissionRepository";



