import { Router } from "express";
import type { PrismaClient } from "@prisma/client";

import { requireAuth } from "@/shared/presentation/http/middleware/requireAuth.middleware";
import { JwtTokenService } from "@/modules/auth/infrastructure/security/JwtTokenService";

import { PrismaAccessControlRepository } from "../../infrastructure/persistence/prisma/PrismaAccessControlRepository";
import { GetMyAccessContextUseCase } from "../../application/usecases/GetMyAccessContextUseCase";
import { AssumeRoleUseCase } from "../../application/usecases/AssumeRoleUseCase";
import { AccessController } from "../controllers/access.controller";
 
export function buildAccessRoutes(db: PrismaClient): Router {
  const r = Router();

  const repo = new PrismaAccessControlRepository(db);
  const getMe = new GetMyAccessContextUseCase(repo);
  const assumeRole = new AssumeRoleUseCase(repo, getMe);
  const tokenService = new JwtTokenService();

  const ctrl = new AccessController(getMe, assumeRole, repo, tokenService);

  // canonical
  r.get("/me", requireAuth, ctrl.getMyAccess);

  // optional alias (safe during transition; you can remove later)
  r.get("/context", requireAuth, ctrl.getMyAccess);

  // canonical switch (UI-friendly)
  r.post("/switch-role", requireAuth, ctrl.switchActiveRole);

  // optional/back-compat rid-based
  r.post("/assume-role", requireAuth, ctrl.assumeActiveRole);

  return r;
}