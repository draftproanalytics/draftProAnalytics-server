// src/domain/auth/services/GoogleAuthService.ts

import type { ExternalProviderProfile } from './ExternalProviderProfile';

/**
 * Domain-level interface for verifying Google ID tokens.
 *
 * Infrastructure (e.g., GoogleAuthServiceImpl) is responsible for:
 *  - calling Google's SDK
 *  - verifying signatures & audience
 *  - mapping the provider payload to ExternalProviderProfile
 */
export interface GoogleAuthService {
  /**
   * Verify a Google ID token and return a normalized profile.
   * Throws if the token is invalid or cannot be trusted.
   */
  verifyIdToken(idToken: string): Promise<ExternalProviderProfile>;
}
