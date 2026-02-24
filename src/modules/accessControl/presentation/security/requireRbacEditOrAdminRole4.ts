import type { NextFunction, Request, Response, RequestHandler } from "express";
import type { AuthUser } from "@/shared/presentation/http/authUser";

type CanFn = (domain: string, action: string) => boolean;

interface AccessLocals {
  can?: CanFn;
}

type AuthedRequest = Request & { user?: AuthUser };

function getUserRoleIds(user: AuthUser | undefined): number[] {
  // Your AuthUser likely has roleIds already; if not, adapt here.
  const maybe = (user as unknown as { roleIds?: number[] }).roleIds;
  return Array.isArray(maybe) ? maybe : [];
}

export const requireRbacEditOrAdminRole4: RequestHandler = (
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const locals = res.locals as AccessLocals;

  // If your app populates a can() helper in locals, honor it first
  if (typeof locals.can === "function" && locals.can("RBAC", "EDIT")) {
    next();
    return;
  }

  const roleIds = getUserRoleIds(req.user);
  if (roleIds.includes(4)) {
    next();
    return;
  }

  res.status(403).json({ message: "Forbidden" });
};
