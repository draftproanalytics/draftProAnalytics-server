// src/domain/auth/services/AppleAuthService.ts

import type { ExternalProviderProfile } from './ExternalProviderProfile';

/**
 * Domain-level interface for verifying Apple ID tokens.
 *
 * Infrastructure (AppleAuthServiceImpl) handles the heavy lifting:
 *  - verifying Apple JWT using Apple's public keys (JWKS)
 *  - validating audience, issuer, expiry, etc.
 *  - mapping payload to ExternalProviderProfile
 */
export interface AppleAuthService {
  /**
   * Verify an Apple ID token and return a normalized profile.
   * Throws if the token is invalid or cannot be trusted.
   */
  verifyIdToken(idToken: string): Promise<ExternalProviderProfile>;
}
