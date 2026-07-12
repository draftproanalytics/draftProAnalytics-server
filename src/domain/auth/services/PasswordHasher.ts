// src/domain/auth/services/PasswordHasher.ts
export interface PasswordHasher {
  hash(plain: string): Promise<string>;  
  compare(plain: string, hash: string): Promise<boolean>;
}

// src/domain/auth/services/SecureTokenGenerator.ts
export interface SecureTokenGenerator {
  generateExpiring(minutesToLive: number): {
    token: string;
    expiresAt: Date;
  };
}
