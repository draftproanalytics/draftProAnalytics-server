import type { IPersonRepository } from '@/domain/person/repositories/IPersonRepository';
import type { IPersonIdentityRepository } from '@/domain/personIdentity/repositories/IPersonIdentityRepository';
import type { AppleAuthService } from '@/domain/auth/services/AppleAuthService';
import type { AuthTokenService } from '@/domain/auth/services/AuthTokenService';
import type { PasswordHasher } from '@/domain/auth/services/PasswordHasher';
import { Person } from '@/domain/person/entities/Person';
import type { SocialLoginInputDTO, SocialLoginResponseDTO } from './SocialLoginDTO';
import { PersonMapper } from '@/domain/person/mapper/PersonMapper';

function usernameBase(email: string | null, providerUserId: string): string {
  const raw = email?.split('@')[0] || `apple_${providerUserId.slice(0, 8)}`;
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(0, 25) || 'apple_user';
}

export class LoginWithAppleUseCase {
  constructor(
    private readonly personRepo: IPersonRepository,
    private readonly identityRepo: IPersonIdentityRepository,
    private readonly appleAuth: AppleAuthService,
    private readonly tokenService: AuthTokenService,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: SocialLoginInputDTO): Promise<SocialLoginResponseDTO> {
    const profile = await this.appleAuth.verifyIdToken(input.credential);
    const provider = 'apple' as const;

    const identity = await this.identityRepo.findByProviderAndUserId(provider, profile.providerUserId);
    let person = identity ? await this.personRepo.findById(identity.personId) : null;

    // Apple may only return name once, but its verified email can link an existing DPA account.
    if (!person && profile.email) {
      person = await this.personRepo.findByEmail(profile.email);
      if (person?.pid) {
        await this.identityRepo.createIdentity({
          personId: person.pid,
          provider,
          providerUserId: profile.providerUserId,
          email: profile.email,
        });
      }
    }

    if (!person) {
      if (!profile.email) {
        throw new Error('Apple did not provide an email. Revoke DPA access in Apple ID settings and try again.');
      }

      const base = usernameBase(profile.email, profile.providerUserId);
      let userName = base;
      let suffix = 1;
      while (await this.personRepo.findByUserName(userName)) {
        const tail = `_${suffix++}`;
        userName = `${base.slice(0, 25 - tail.length)}${tail}`;
      }

      const hashedPassword = await this.hasher.hash(`ext-apple-${profile.providerUserId}`);
      const entity = Person.create({
        userName,
        emailAddress: profile.email,
        passwordHash: hashedPassword,
        firstName: (input.firstName || 'Apple').slice(0, 25),
        lastName: (input.lastName || 'User').slice(0, 35),
        activeRid: 1,
      });
      const saved = await this.personRepo.createPerson(PersonMapper.mapPersonToNewPersonInput(entity));
      person = Person.fromPersistence(saved);

      await this.identityRepo.createIdentity({
        personId: person.pid!,
        provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
      });
    }

    if (!person.pid) throw new Error('Person not found after Apple login');
    if (!person.isActive) throw new Error('This DPA account is inactive');

    if (!person.emailVerified) {
      person.markEmailVerified();
      await this.personRepo.updatePerson(person);
    }

    const activeRid = person.activeRid ?? 1;
    return {
      accessToken: this.tokenService.generateAccessToken(person.pid, person.userName, activeRid),
      personId: person.pid,
      userName: person.userName,
    };
  }
}
