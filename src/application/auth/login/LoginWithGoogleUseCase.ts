// src/application/auth/login/LoginWithGoogleUseCase.ts
import type { IPersonRepository } from '@/domain/person/repositories/IPersonRepository';
import type { IPersonIdentityRepository } from '@/domain/personIdentity/repositories/IPersonIdentityRepository';
import type { GoogleAuthService } from '@/domain/auth/services/GoogleAuthService';
import type { AuthTokenService } from '@/domain/auth/services/AuthTokenService';
import type { PasswordHasher } from '@/domain/auth/services/PasswordHasher';
import { Person } from '@/domain/person/entities/Person';
import type { SocialLoginInputDTO, SocialLoginResponseDTO } from './SocialLoginDTO';
import { PersonMapper } from '@/domain/person/mapper/PersonMapper';

export class LoginWithGoogleUseCase {
  constructor(
    private readonly personRepo: IPersonRepository,
    private readonly identityRepo: IPersonIdentityRepository,
    private readonly googleAuth: GoogleAuthService,
    private readonly tokenService: AuthTokenService,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: SocialLoginInputDTO): Promise<SocialLoginResponseDTO> {
    const { credential } = input;

    // 1) Verify id_token with Google
    const profile = await this.googleAuth.verifyIdToken(credential);
    const provider: 'google' = 'google';
    const providerUserId = profile.providerUserId;

    // 2) Look for existing identity
    const identity = await this.identityRepo.findByProviderAndUserId(
      provider,
      providerUserId
    );

    let person = identity ? await this.personRepo.findById(identity.personId) : null;

    // 3) Create Person + PersonIdentity if needed
    if (!person) {
      const email = profile.email ?? '';
      const firstName = profile.firstName ?? 'Google';
      const lastName = profile.lastName ?? 'User';
      const userNameBase = email || `google_${providerUserId.slice(0, 8)}`;

      let userName = userNameBase;
      let suffix = 1;
      // naive uniqueness loop; fine for now
      // eslint-disable-next-line no-constant-condition
      while (await this.personRepo.findByUserName(userName)) {
        userName = `${userNameBase}_${suffix++}`;
      }

      const randomPassword = `ext-google-${providerUserId}`;
      const hashedPassword = await this.hasher.hash(randomPassword);

      const newPersonEntity = Person.create({
        userName,
        emailAddress: email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        activeRid: 1,
      });

      // Map Person -> NewPersonInput before calling repo
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
      throw new Error('Person not found after Google login');
    }

    person.markEmailVerified();
    await this.personRepo.updatePerson(person);

    const accessToken = this.tokenService.generateAccessToken(
      person.pid,
      person.userName,
      person.activeRid ? person.activeRid : 0
    );

    return {
      accessToken,
      personId: person.pid,
      userName: person.userName,
    };
  }
}
