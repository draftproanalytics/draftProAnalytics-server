// src/infrastructure/auth/GoogleAuthServiceImpl.ts
import { OAuth2Client } from 'google-auth-library';
import type { GoogleAuthService } from '@/domain/auth/services/GoogleAuthService';
import type {
  ExternalProviderProfile,
  IdentityProvider,
} from '@/domain/auth/services/ExternalProviderProfile';

export class GoogleAuthServiceImpl implements GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly audience: string;

  constructor(clientId: string) {
    if (!clientId) {
      throw new Error('GoogleAuthServiceImpl: clientId is required');
    }

    this.client = new OAuth2Client(clientId);
    this.audience = clientId;
  }

  async verifyIdToken(idToken: string): Promise<ExternalProviderProfile> {
    if (!idToken) {
      throw new Error('GoogleAuthServiceImpl: idToken is required');
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.audience,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub) {
      throw new Error('GoogleAuthServiceImpl: invalid Google ID token payload');
    }

    if (payload.email_verified !== true) {
      throw new Error('Google email address is not verified');
    }

    const provider: IdentityProvider = 'google';

    return {
      provider,
      providerUserId: payload.sub,
      email: payload.email?.toLowerCase() ?? null,
      firstName: (payload.given_name as string | undefined) ?? null,
      lastName: (payload.family_name as string | undefined) ?? null,
    };
  }
}
