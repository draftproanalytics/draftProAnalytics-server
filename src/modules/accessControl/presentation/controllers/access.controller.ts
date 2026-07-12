import type { Request, Response } from "express";
import { z } from "zod";

import { GetMyAccessContextUseCase } from "../../application/usecases/GetMyAccessContextUseCase";
import { AssumeRoleUseCase } from "../../application/usecases/AssumeRoleUseCase";
import type { IAccessControlRepository } from "../../domain/repositories/IAccessControlRepository";
import {
  ForbiddenError,
  NotAuthenticatedError,
  NotFoundError,
  ValidationError,
} from "../../domain/access.errors";

import { switchRoleSchema, assumeRoleSchema } from "../http/access.schemas";

type UserShape = { sub?: unknown; personId?: unknown; pid?: unknown; id?: unknown; userId?: unknown };

type AccessTokenIssuer = {
  issueTokens(input: { personId: number; userName: string; activeRid: number }): {
    accessToken: string;
    accessExpiresInSec: number;
  };
};

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

export class AccessController {
  public constructor(
    private readonly getMe: GetMyAccessContextUseCase,
    private readonly assumeRole: AssumeRoleUseCase,
    private readonly repo: IAccessControlRepository,
    private readonly tokenIssuer: AccessTokenIssuer,
  ) {}

  // Canonical: GET /access/me
  // Optional alias: GET /access/context
  public getMyAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const personId = extractPersonId(req);
      const payload = await this.getMe.execute(personId);
      res.json(payload);
    } catch (err: unknown) {
      this.handleError(res, err);
    }
  };

  // Canonical: POST /access/switch-role { roleName }
  // Converts roleName -> rid and delegates to AssumeRoleUseCase
  public switchActiveRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const personId = extractPersonId(req);
      const parsed = switchRoleSchema.parse(req.body);

      const roleName = parsed.roleName.trim();
      const role = await this.repo.getRoleByName(roleName);
      if (!role) throw new NotFoundError(`Role '${roleName}' not found.`);

      const payload = await this.assumeRole.execute(personId, role.rid);
      const tokens = this.tokenIssuer.issueTokens({
        personId: payload.personId,
        userName: payload.userName,
        activeRid: payload.activeRid,
      });

      res.json({
        ...payload,
        accessToken: tokens.accessToken,
        accessExpiresInSec: tokens.accessExpiresInSec,
      });
    } catch (err: unknown) {
      this.handleError(res, err);
    }
  };

  // Optional/back-compat: POST /access/assume-role { toRid }
  public assumeActiveRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const personId = extractPersonId(req);
      const parsed = assumeRoleSchema.parse(req.body);

      const payload = await this.assumeRole.execute(personId, parsed.toRid);
      const tokens = this.tokenIssuer.issueTokens({
        personId: payload.personId,
        userName: payload.userName,
        activeRid: payload.activeRid,
      });

      res.json({
        ...payload,
        accessToken: tokens.accessToken,
        accessExpiresInSec: tokens.accessExpiresInSec,
      });
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
    console.error("AccessController error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}