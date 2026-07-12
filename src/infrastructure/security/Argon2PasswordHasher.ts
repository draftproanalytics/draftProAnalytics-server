
import { PasswordHasher } from "@/domain/auth/services/PasswordHasher";
import { createLogger } from "@/utils/Logger";
import argon2 from "argon2";

const logger = createLogger('Argon2PasswordHasher');
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return await argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    logger.debug("compare plain: "+plain+" hash: "+hash)
    return await argon2.verify(hash, plain);
  }
}

