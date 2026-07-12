// src/application/auth/login/LoginUseCase.ts
import type { IPersonRepository } from "@/domain/person/repositories/IPersonRepository";
import type { PasswordHasher } from "@/domain/auth/services/PasswordHasher";
import type { LoginInputDTO, LoginResponseDTO } from "./LoginDTO";
import { JwtTokenService } from "@/modules/auth/infrastructure/security/JwtTokenService";
import { createLogger } from "@/utils/Logger";

export class LoginUseCase {
  private logger = createLogger("LoginUseCase");

  constructor(
    private readonly personRepo: IPersonRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: JwtTokenService
  ) {}

  public async execute(input: LoginInputDTO): Promise<LoginResponseDTO> {
    const { userName, password } = input;
    const devBypassEmailVerification = this.isEnabledDevFlag("DEV_BYPASS_EMAIL_VERIFICATION");
    const suppressRegistrationEmail  = this.isEnabledDevFlag("DEV_SUPPRESS_REGISTRATION_EMAIL");

    // 1) Find user
    const person = await this.personRepo.findByUserName(userName);
    if (!person || !person.passwordHash) {
      throw new Error("Invalid credentials");
    }

    if (!person.pid) {
      throw new Error("Person ID missing");
    }

    // 2) Optional: require verified email
    if (devBypassEmailVerification) {
      this.logger.warn(
        `DEV_BYPASS_EMAIL_VERIFICATION=true; skipping verification token/email for pid=${person.pid}`
      );          
    }else if (!person.emailVerified) {
      throw new Error("Email not verified");
    }

    // 3) Compare password
    const ok = await this.hasher.compare(password, person.passwordHash);
    if (!ok) {
      throw new Error("Invalid credentials password: "+password+" hash: "+person.passwordHash);
    }

    // 4) Issue access token WITH activeRid embedded
    const effectiveActiveRid = typeof person.activeRid === "number" ? person.activeRid : 1;

    const { accessToken } = this.tokens.issueTokens({
      personId: person.pid,
      userName: person.userName,
      activeRid: effectiveActiveRid,
    });

    // NOTE: leaving refresh-token issuance out here because your LoginResponseDTO
    // currently only returns accessToken/personId/userName/activeRid.
    // (You can add refresh later once the frontend expects it.)

    return {
      accessToken,
      personId: person.pid,
      userName: person.userName,
      activeRid: effectiveActiveRid,
    };
  }
  private isEnabledDevFlag(name: string): boolean {
    return process.env.NODE_ENV !== "production" && process.env[name] === "true";
  }
}
