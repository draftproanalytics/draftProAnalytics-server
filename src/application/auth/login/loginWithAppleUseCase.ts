// src/application/auth/login/LoginWithAppleUseCase.ts
import type { IPersonRepository } from '@/domain/person/repositories/IPersonRepository';
import type { IPersonIdentityRepository } from '@/domain/personIdentity/repositories/IPersonIdentityRepository';
import type { AppleAuthService } from '@/domain/auth/services/AppleAuthService';
import type { AuthTokenService } from '@/domain/auth/services/AuthTokenService';
import type { PasswordHasher } from '@/domain/auth/services/PasswordHasher';
import { Person } from '@/domain/person/entities/Person';
import type { SocialLoginInputDTO, SocialLoginResponseDTO } from './SocialLoginDTO';
import { PersonMapper } from '@/domain/person/mapper/PersonMapper';

export class LoginWithAppleUseCase {
  constructor(
    private readonly personRepo: IPersonRepository,
    private readonly identityRepo: IPersonIdentityRepository,
    private readonly appleAuth: AppleAuthService,
    private readonly tokenService: AuthTokenService,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: SocialLoginInputDTO): Promise<SocialLoginResponseDTO> {
    const { credential } = input;

    const profile = await this.appleAuth.verifyIdToken(credential);
    const provider: 'apple' = 'apple';
    const providerUserId = profile.providerUserId;

    const identity = await this.identityRepo.findByProviderAndUserId(
      provider,
      providerUserId
    );

    let person = identity ? await this.personRepo.findById(identity.personId) : null;

    if (!person) {
      const email = profile.email ?? '';
      const firstName = profile.firstName ?? 'Apple';
      const lastName = profile.lastName ?? 'User';
      const userNameBase = email || `apple_${providerUserId.slice(0, 8)}`;

      let userName = userNameBase;
      let suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (await this.personRepo.findByUserName(userName)) {
        userName = `${userNameBase}_${suffix++}`;
      }

      const randomPassword = `ext-apple-${providerUserId}`;
      const hashedPassword = await this.hasher.hash(randomPassword);

      const newPersonEntity = Person.create({
        userName,
        emailAddress: email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        activeRid: 1,
      });
      
      const newPersonInput = PersonMapper.mapPersonToNewPersonInput(newPersonEntity);
      const savedRow = await this.personRepo.createPerson(newPersonInput);

      person = Person.fromPersistence(savedRow);

      await this.identityRepo.createIdentity({
        personId: person.pid!,
        provider,
        providerUserId,
        email: email || null,
      });
    }

    if (!person || !person.pid) {
      throw new Error('Person not found after Apple login');
    }

    person.markEmailVerified();
    await this.personRepo.updatePerson(person);

    const accessToken = this.tokenService.generateAccessToken(
      person.pid,
      person.userName,
      person.activeRid ? person.activeRid : 0,
    );

    return {
      accessToken,
      personId: person.pid,
      userName: person.userName,
    };
  }
}
