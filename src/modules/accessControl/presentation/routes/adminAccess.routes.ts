import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import type { RequestHandler } from "express";

import { requireAuth } from "@/shared/presentation/http/middleware/requireAuth.middleware";
import { requireRbacEditOrAdminRole4 } from "../security/requireRbacEditOrAdminRole4";

import { PrismaAccessControlRepository } from "../../infrastructure/persistence/prisma/PrismaAccessControlRepository";
import { ListAccessUsersUseCase } from "../../application/usecases/ListAccessUsersUseCase";
import { UpdateUserRolesUseCase } from "../../application/usecases/UpdateUserRolesUseCase";

import { PrismaAdminAccessRepository } from "../../infrastructure/persistence/prisma/PrismaAdminAccessRepository";

import { AdminAccessController } from "../controllers/admin.access.controller";

export function buildAdminAccessRouter(db: PrismaClient): Router {
  const router = Router();

  const adminRepo = new PrismaAdminAccessRepository(db);
  const repo = new PrismaAccessControlRepository(db);
  const listUsersUc = new ListAccessUsersUseCase(adminRepo);
  const updateUserRolesUc = new UpdateUserRolesUseCase(adminRepo);

  const controller = new AdminAccessController(listUsersUc, updateUserRolesUc, repo);

  const guard: RequestHandler[] = [requireAuth, requireRbacEditOrAdminRole4];

  router.get("/users", ...guard, controller.listUsers);
  router.put("/users/:pid/roles", ...guard, controller.updateUserRoles);

  router.post("/users/:pid/roles/grant", ...guard, controller.grantRoleToPerson);
  router.post("/users/:pid/roles/revoke", ...guard, controller.revokeRoleFromPerson);

  return router;
}
