// src/domain/person/dtos/PersonIdentityDTO.ts

import type { IdentityProvider } from '@/domain/auth/services/ExternalProviderProfile';

/**
 * API-safe DTO for returning PersonIdentity info if needed.
 */
export interface PersonIdentityDTO {
  id: number;
  personId: number;
  provider: IdentityProvider;
  providerUserId: string;
  email: string | null;
  createdAt: string; // ISO string for JSON responses
}
