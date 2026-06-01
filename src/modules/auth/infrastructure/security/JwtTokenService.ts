
import jwt from "jsonwebtoken";
import type { AuthUser } from "@/shared/presentation/http/authUser";
import { createLogger } from "@/utils/Logger";

/**
 * Access token claims:
 * - Use JWT standard "sub" for subject (person id) as a string
 * - Include userName + activeRid so the frontend can do visibility/guards
 */
export interface AccessTokenClaims {
  sub: string; // personId as string (JWT standard)
  userName: string;
  activeRid: number; // public=1 dev=2 qa=3 admin=4
}

export interface RefreshTokenClaims {
  sub: string; // personId as string (JWT standard)
  tokenVersion: number; // optional; keep 1 for now if you don't track versions
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSec: number;
  refreshExpiresInSec: number;
}
const logger = createLogger("JwtTokenService")
function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringNonEmpty(v: unknown): string | null {
  if (typeof v === "string" && v.trim().length > 0) return v.trim();
  return null;
}

export class JwtTokenService {

  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  private readonly accessExpiresInSec = 15 * 60; // 15m
  private readonly refreshExpiresInSec = 30 * 24 * 60 * 60; // 30d

  constructor() {
    const access = process.env.JWT_ACCESS_SECRET;
    const refresh = process.env.JWT_REFRESH_SECRET;

    console.log('[JwtTokenService] JWT_ACCESS_SECRET =', process.env.JWT_ACCESS_SECRET);
    if (!access || access.trim().length === 0) throw new Error("Missing JWT_ACCESS_SECRET");
    if (!refresh || refresh.trim().length === 0) throw new Error("Missing JWT_REFRESH_SECRET");

    this.accessSecret = access;
    this.refreshSecret = refresh;
  }

  /**
   * Issue access+refresh tokens.
   * Call with the user's current activeRid (from Person.activeRid).
   */
  public issueTokens(
    input: { personId: number; userName: string; activeRid: number },
    tokenVersion = 1
  ): Tokens {
    const accessClaims: AccessTokenClaims = {
      sub: String(input.personId),
      userName: input.userName,
      activeRid: input.activeRid,
    };

    const refreshClaims: RefreshTokenClaims = {
      sub: String(input.personId),
      tokenVersion,
    };

    const accessToken = jwt.sign(accessClaims, this.accessSecret, {      
      expiresIn: this.accessExpiresInSec,
    });

    const refreshToken = jwt.sign(refreshClaims, this.refreshSecret, {
      expiresIn: this.refreshExpiresInSec,
    });
    logger.debug("issueToken - refreshToken: ", JSON.stringify(refreshToken,null,2));
    logger.debug("issueToken - accessToken: ", JSON.stringify(accessToken,null,2));
    return {
      accessToken,
      refreshToken,
      accessExpiresInSec: this.accessExpiresInSec,
      refreshExpiresInSec: this.refreshExpiresInSec,
    };
  }

  /**
   * Verify access token and return the normalized AuthUser used by Express.
   * Backwards compatible: accepts legacy personId/pid/id/userId fields if present.
   */
  public verifyAccessToken(token: string): AuthUser {
    const decoded = jwt.verify(token, this.accessSecret) as unknown;
    logger.debug("verifyAccessToken - decoded: ", JSON.stringify(decoded,null,2));
    logger.debug("verifyAccessToken - incomingToken: ", token);
    if (!decoded || typeof decoded !== "object") throw new Error("Invalid access token");

    const o = decoded as Record<string, unknown>;

    // Support standard sub, plus legacy fallbacks
    const personId =
      toNumber(o.sub) ??
      toNumber(o.personId) ??
      toNumber(o.pid) ??
      toNumber(o.id) ??
      toNumber(o.userId);

    if (!personId) throw new Error("Invalid access token claims");

    const userName = toStringNonEmpty(o.userName) ?? undefined;

    // IMPORTANT: include activeRid for the frontend + guards
    const activeRid = toNumber(o.activeRid) ?? undefined;

    return { personId, userName, activeRid };
  }

  public verifyRefreshToken(token: string): RefreshTokenClaims {
    const decoded = jwt.verify(token, this.refreshSecret) as unknown;
    logger.debug("verifyRefreshToken - decoded: ", JSON.stringify(decoded,null,2));
    logger.debug("verifyRefreshToken - incomingToken: ", token);
    if (!decoded || typeof decoded !== "object") throw new Error("Invalid refresh token");

    const o = decoded as Record<string, unknown>;

    const sub = toStringNonEmpty(o.sub) ?? toStringNonEmpty(o.personId) ?? null;
    const tokenVersion = toNumber(o.tokenVersion);

    if (!sub) throw new Error("Invalid refresh token claims");
    if (!tokenVersion) throw new Error("Invalid refresh token claims");

    return { sub, tokenVersion };
  }
}
