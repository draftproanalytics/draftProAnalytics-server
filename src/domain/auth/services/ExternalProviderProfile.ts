// src/domain/auth/services/ExternalProviderProfile.ts

/**
 * Supported external identity providers.
 * Extend this union if you later add more (e.g., 'github', 'facebook').
 */
export type IdentityProvider = 'google' | 'apple';

/**
 * Normalized user profile returned by external providers (Google, Apple).
 * This is the *domain* shape that all provider-specific services must map to.
 */
export interface ExternalProviderProfile {
  provider: IdentityProvider;
  /** Provider's stable user identifier (e.g. Google "sub", Apple "sub"). */
  providerUserId: string;
  /** Best-effort email from provider (can be null if not provided or hidden). */
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}
