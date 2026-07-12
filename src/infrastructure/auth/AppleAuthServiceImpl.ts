// src/infrastructure/auth/AppleAuthServiceImpl.ts

import type { AppleAuthService } from '@/domain/auth/services/AppleAuthService';
import type {
  ExternalProviderProfile,
  IdentityProvider,
} from '@/domain/auth/services/ExternalProviderProfile';

/**
 * Placeholder AppleAuthService implementation.
 *
 * DO NOT USE IN PRODUCTION as-is.
 * You must replace the body of verifyIdToken with real Apple token verification:
 *  - Fetch Apple's JWKS
 *  - Verify JWT signature, audience, iss, exp
 *  - Map payload.sub/email/name to ExternalProviderProfile
 */
export class AppleAuthServiceImpl implements AppleAuthService {
  // You can inject configuration here later (teamId, clientId, keyId, privateKey, etc.)
  constructor() {
    // No-op for now
  }

  async verifyIdToken(_idToken: string): Promise<ExternalProviderProfile> {
    // This explicit error keeps behavior safe until you implement Apple SSO properly.
    throw new Error('AppleAuthServiceImpl.verifyIdToken is not implemented yet');
  }
}
