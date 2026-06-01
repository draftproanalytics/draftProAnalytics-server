// src/infrastructure/auth/SecureTokenGeneratorImpl.ts
import crypto from 'crypto';
import type { SecureTokenGenerator } from '@/domain/auth/services/SecureTokenGenerator';

export class SecureTokenGeneratorImpl implements SecureTokenGenerator {
  constructor(private readonly secret: string) {
    if (!secret) {
      //throw new Error('SECURE_TOKEN_SECRET is not configured');
      console.log("No Google Secret id passed")
    }
  }

  // basic random token generator
  generateToken(length = 32): string {
    // 32 bytes → 64 hex chars
    return crypto.randomBytes(length).toString('hex');
  }

  generateExpiring(minutesToLive: number): { token: string; expiresAt: Date } {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + minutesToLive * 60 * 1000);
    return { token, expiresAt };
  }
}
