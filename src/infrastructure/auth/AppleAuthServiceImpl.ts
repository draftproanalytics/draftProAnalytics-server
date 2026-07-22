
    

    import crypto from 'node:crypto';
import jwt, {
  type JwtHeader,
  type JwtPayload,
} from 'jsonwebtoken';

import type { AppleAuthService } from '@/domain/auth/services/AppleAuthService';
import type { ExternalProviderProfile } from '@/domain/auth/services/ExternalProviderProfile';

/**
 * RSA JSON Web Key returned by:
 * https://appleid.apple.com/auth/keys
 *
 * Defining this locally avoids depending on the browser DOM JsonWebKey type.
 */
interface AppleJwk extends Record<string, string> {
  kty: 'RSA';
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface AppleJwksResponse {
  keys: AppleJwk[];
}

interface AppleTokenPayload extends JwtPayload {
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
}

export class AppleAuthServiceImpl implements AppleAuthService {
  private readonly audience: string;

  private cachedKeys: AppleJwk[] = [];

  private keysExpireAt = 0;

  constructor(audience: string) {
    if (!audience.trim()) {
      throw new Error(
        'AppleAuthServiceImpl: APPLE_CLIENT_ID is required',
      );
    }

    this.audience = audience;
  }

  async verifyIdToken(
    idToken: string,
  ): Promise<ExternalProviderProfile> {
    if (!idToken.trim()) {
      throw new Error(
        'AppleAuthServiceImpl: idToken is required',
      );
    }

    const decodedToken = jwt.decode(idToken, {
      complete: true,
    });

    if (
      !decodedToken
      || typeof decodedToken === 'string'
    ) {
      throw new Error('Invalid Apple identity token');
    }

    const header: JwtHeader = decodedToken.header;

    if (!header.kid || header.alg !== 'RS256') {
      throw new Error('Invalid Apple token header');
    }

    const signingKey = await this.getSigningKey(
      header.kid,
    );

    const publicKey = crypto.createPublicKey({
      key: signingKey,
      format: 'jwk',
    });


    const verifiedPayload = jwt.verify(
      idToken,
      publicKey,
      {
        algorithms: ['RS256'],
        audience: this.audience,
        issuer: 'https://appleid.apple.com',
      },
    );

    const payload =
      this.toAppleTokenPayload(verifiedPayload);

    return {
      provider: 'apple',
      providerUserId: payload.sub,
      email: this.getVerifiedEmail(payload),
      firstName: null,
      lastName: null,
    };
  }

  private async getSigningKey(
    kid: string,
  ): Promise<AppleJwk> {
    await this.refreshSigningKeysWhenRequired();

    const signingKey = this.cachedKeys.find(
      (candidate) => candidate.kid === kid,
    );

    if (signingKey) {
      return signingKey;
    }

    /*
     * Apple may have rotated signing keys while our cache was active.
     * Force one immediate refresh before rejecting the token.
     */
    await this.refreshSigningKeys(true);

    const refreshedSigningKey = this.cachedKeys.find(
      (candidate) => candidate.kid === kid,
    );

    if (!refreshedSigningKey) {
      throw new Error(
        `Apple signing key was not found for kid ${kid}`,
      );
    }

    return refreshedSigningKey;
  }

  private async refreshSigningKeysWhenRequired():
    Promise<void> {
    const cacheExpired =
      Date.now() >= this.keysExpireAt;

    if (
      cacheExpired
      || this.cachedKeys.length === 0
    ) {
      await this.refreshSigningKeys();
    }
  }

  private async refreshSigningKeys(
    force = false,
  ): Promise<void> {
    if (
      !force
      && this.cachedKeys.length > 0
      && Date.now() < this.keysExpireAt
    ) {
      return;
    }

    const response = await fetch(
      'https://appleid.apple.com/auth/keys',
    );

    if (!response.ok) {
      throw new Error(
        `Unable to retrieve Apple signing keys `
        + `(${response.status})`,
      );
    }

    const responseBody: unknown =
      await response.json();

    const jwksResponse =
      this.toAppleJwksResponse(responseBody);

    this.cachedKeys = jwksResponse.keys;

    this.keysExpireAt =
      Date.now() + 60 * 60 * 1000;
  }

  private toAppleTokenPayload(
    verifiedPayload: string | JwtPayload,
  ): AppleTokenPayload {
    if (
      typeof verifiedPayload === 'string'
      || typeof verifiedPayload.sub !== 'string'
      || verifiedPayload.sub.length === 0
    ) {
      throw new Error(
        'Apple identity token is missing sub',
      );
    }

    return {
      ...verifiedPayload,
      sub: verifiedPayload.sub,
    };
  }

  private getVerifiedEmail(
    payload: AppleTokenPayload,
  ): string | null {
    if (
      typeof payload.email !== 'string'
      || payload.email.length === 0
    ) {
      return null;
    }

    const emailVerified =
      payload.email_verified === true
      || payload.email_verified === 'true';

    if (!emailVerified) {
      throw new Error(
        'Apple identity token email is not verified',
      );
    }

    return payload.email.toLowerCase();
  }

  private toAppleJwksResponse(
    value: unknown,
  ): AppleJwksResponse {
    if (!this.isRecord(value)) {
      throw new Error(
        'Apple signing-key response is invalid',
      );
    }

    const keys = value.keys;

    if (!Array.isArray(keys)) {
      throw new Error(
        'Apple signing-key response contains no keys',
      );
    }

    const validKeys = keys.filter(
      (candidate): candidate is AppleJwk =>
        this.isAppleJwk(candidate),
    );

    if (validKeys.length === 0) {
      throw new Error(
        'Apple signing-key response contains no valid RSA keys',
      );
    }

    return {
      keys: validKeys,
    };
  }

  private isAppleJwk(
    value: unknown,
  ): value is AppleJwk {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value.kty === 'RSA'
      && typeof value.kid === 'string'
      && typeof value.n === 'string'
      && typeof value.e === 'string'
    );
  }

  private isRecord(
    value: unknown,
  ): value is Record<string, unknown> {
    return (
      typeof value === 'object'
      && value !== null
      && !Array.isArray(value)
    );
  }
}
