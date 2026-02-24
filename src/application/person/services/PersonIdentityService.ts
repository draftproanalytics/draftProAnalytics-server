// src/application/person/services/PersonIdentityService.ts

import type {
  IPersonIdentityRepository,
  PersonIdentityRecord,
} from '@/domain/personIdentity/repositories/IPersonIdentityRepository';
import type { IdentityProvider } from '@/domain/auth/services/ExternalProviderProfile';

export class PersonIdentityService {
  constructor(private readonly repo: IPersonIdentityRepository) {}

  async getByProviderAndUserId(
    provider: IdentityProvider,
    providerUserId: string,
  ): Promise<PersonIdentityRecord | null> {
    return this.repo.findByProviderAndUserId(provider, providerUserId);
  }

  async createIdentity(input: {
    personId: number;
    provider: IdentityProvider;
    providerUserId: string;
    email: string | null;
  }): Promise<PersonIdentityRecord> {
    return this.repo.createIdentity(input);
  }
}
