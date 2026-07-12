import type { NextFunction, Request, Response, RequestHandler } from "express";
import type { AuthUser } from "@/shared/presentation/http/authUser";

type CanFn = (domain: string, action: string) => boolean;

interface AccessLocals {
  can?: CanFn;
}

type AuthedRequest = Request & { user?: AuthUser };

function getActiveRid(user: AuthUser | undefined): number | null {
  if (!user) return null;

  const activeRid = (user as unknown as { activeRid?: unknown }).activeRid;

  if (typeof activeRid === "number" && Number.isFinite(activeRid)) {
    return activeRid;
  }

  if (typeof activeRid === "string") {
    const n = Number(activeRid);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function getRoleIds(user: AuthUser | undefined): number[] {
  const maybe = (user as unknown as { roleIds?: unknown }).roleIds;

  if (!Array.isArray(maybe)) {
    return [];
  }

  return maybe
    .map(v => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    })
    .filter((v): v is number => v !== null);
}

export const requireRbacEditOrAdminRole4: RequestHandler = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const locals = res.locals as AccessLocals;

  if (typeof locals.can === "function" && locals.can("RBAC", "EDIT")) {
    next();
    return;
  }

  const activeRid = getActiveRid(req.user);
  const roleIds = getRoleIds(req.user);

  if (activeRid === 4 || roleIds.includes(4)) {
    next();
    return;
  }

  res.status(403).json({
    error: "FORBIDDEN",
    message: "Admin role is required.",
  });
};