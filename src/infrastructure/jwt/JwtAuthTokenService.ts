// src/infrastructure/jwt/JwtAuthTokenService.ts
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import type { AuthTokenService } from '@/domain/auth/services/AuthTokenService';

type AccessTokenPayload = JwtPayload & {
  sub: string;
  userName: string;
  activeRid: number;
};

export class JwtAuthTokenService implements AuthTokenService {
  private readonly accessSecret: string;
  private readonly refreshMinutes: number;

  constructor() {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    this.accessSecret = accessSecret;

    const refreshMinutesRaw = process.env.JWT_REFRESH_MINUTES ?? '43200'; // 30 days
    const refreshMinutesNum = Number(refreshMinutesRaw);

    if (!Number.isFinite(refreshMinutesNum) || refreshMinutesNum <= 0) {
      throw new Error(
        `JWT_REFRESH_MINUTES is invalid: "${refreshMinutesRaw}". Expected a positive number.`
      );
    }

    this.refreshMinutes = refreshMinutesNum;
  }

  generateAccessToken(personId: number, userName: string, activeRid: number): string {
    const payload: AccessTokenPayload = {
      sub: personId.toString(),   // 👈 store as string to satisfy JwtPayload
      userName,
      activeRid,
    };

    return jwt.sign(payload, this.accessSecret, { expiresIn: '15m' });
  }

  generateRefreshToken(): { token: string; expiresAt: Date } {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshMinutes * 60_000);
    return { token, expiresAt };
  }

  verifyAccessToken(token: string): { personId: number; userName: string, activeRid: number  } {
    let decoded: AccessTokenPayload;

    try {
      decoded = jwt.verify(token, this.accessSecret) as AccessTokenPayload;
    } catch {
      throw new Error('Invalid or expired access token');
    }

    if (!decoded || typeof decoded.userName !== 'string' || typeof decoded.sub !== 'string') {
      throw new Error('Invalid token payload');
    }

    const personId = Number.parseInt(decoded.sub, 10);
    if (!Number.isFinite(personId)) {
      throw new Error('Invalid person ID in token');
    }

    return {
      personId,
      userName: decoded.userName,
      activeRid: decoded.activeRid
    };
  }
}
