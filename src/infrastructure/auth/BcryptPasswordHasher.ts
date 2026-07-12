// src/infrastructure/auth/BcryptPasswordHasher.ts
import bcrypt from 'bcrypt';
import type { PasswordHasher } from '@/domain/auth/services/PasswordHasher';
import { createLogger } from '@/utils/Logger';

const logger = createLogger('BcryptPasswordHasher');
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly saltRounds = 10;

  async hash(plain: string): Promise<string> {
    if (!plain) {
      throw new Error('Password is required for hashing');
    }
    return bcrypt.hash(plain, this.saltRounds);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    if (!plain || !hash) {
      return false;
    }
    logger.debug("compare plain: "+plain+" hash: "+hash)
    return bcrypt.compare(plain, hash);
  }
}
