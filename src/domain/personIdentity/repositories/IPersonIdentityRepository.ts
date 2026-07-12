// src/domain/personIdentity/repositories/IPersonIdentityRepository.ts

import type { IdentityProvider } from '@/domain/auth/services/ExternalProviderProfile';

export interface PersonIdentityRecord {
  id: number;
  personId: number;
  provider: IdentityProvider;
  providerUserId: string;
  email: string | null;
  createdAt: Date;
}

export interface IPersonIdentityRepository {
  findByProviderAndUserId(
    provider: IdentityProvider,
    providerUserId: string,
  ): Promise<PersonIdentityRecord | null>;

  createIdentity(input: {
    personId: number;
    provider: IdentityProvider;
    providerUserId: string;
    email: string | null;
  }): Promise<PersonIdentityRecord>;
}
