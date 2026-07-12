// src/application/auth/register/RegisterUseCase.ts
import { IPersonRepository } from "@/domain/person/repositories/IPersonRepository";
import { PasswordHasher } from "@/domain/auth/services/PasswordHasher";
import { SecureTokenGenerator } from "@/domain/auth/services/SecureTokenGenerator";
import type { MailService } from "@/domain/mail/services/MailService";
import type { MailMessage } from "@/domain/mail/value-objects/MailMessage";
import { Person } from "@/domain/person/entities/Person";
import { EmailVerificationToken } from "@/domain/auth/entities/EmailVerificationToken";
import { PersonMapper } from "@/domain/person/mapper/PersonMapper";
import { RegisterInputDTO, RegisterResponse } from "./RegisterDTO";
import { createLogger } from "@/utils/Logger";

export class RegisterUseCase {
  private logger = createLogger("RegisterUseCase");

  constructor(
    private readonly personRepo: IPersonRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenGen: SecureTokenGenerator,
    private readonly mailer: MailService
  ) {}

  async execute(input: RegisterInputDTO): Promise<RegisterResponse> {
    const devBypassEmailVerification = this.isEnabledDevFlag("DEV_BYPASS_EMAIL_VERIFICATION");
    const suppressRegistrationEmail  = this.isEnabledDevFlag("DEV_SUPPRESS_REGISTRATION_EMAIL");

    const userName = input.userName?.trim();
    const emailAddress = input.emailAddress?.trim().toLowerCase();
    const firstName = input.firstName?.trim();
    const lastName = input.lastName?.trim();

    if (!userName) {
      throw new Error("Username is required");
    }

    if (!emailAddress) {
      throw new Error("Email address is required");
    }

    if (!input.password) {
      throw new Error("Password is required");
    }

    if (!firstName) {
      throw new Error("First name is required");
    }

    if (!lastName) {
      throw new Error("Last name is required");
    }

    this.logger.info(`Looking up person by username: ${userName}`);

    const existingUserName = await this.personRepo.findByUserName(userName);
    if (existingUserName) {
      throw new Error(`Username (${userName}) already exists`);
    }

    /*
      Keep this check enabled.

      DEV_BYPASS_EMAIL_VERIFICATION means:
        - do not require the user to click a verification email

      It should not mean:
        - allow duplicate email addresses

      For dummy users, use unique test emails like:
        dummy-public-001@example.test
        dummy-public-002@example.test
    */
    this.logger.info(`Checking emailAddress: ${emailAddress}`);

    const existingEmail = await this.personRepo.findByEmail(emailAddress);
    if (existingEmail) {
      throw new Error(`Email (${emailAddress}) already exists`);
    }

    const hashedPassword = await this.hasher.hash(input.password);

    const person = Person.create({
      userName,
      emailAddress,
      passwordHash: hashedPassword,
      firstName,
      lastName,
    });

    /*
      Important:
      The default public role assignment should happen inside createPerson():

        Person.activeRid = 1
        PersonRole(personId, roleId = 1)

      That is the code path you want to test.
    */
    const saved = await this.personRepo.createPerson(
      PersonMapper.mapPersonToNewPersonInput(person)
    );

    if (!saved.pid) {
      throw new Error("Registration failed: saved person is missing pid");
    }

    /*
      Dev-only path for testing registration + default role assignment.

      This bypasses the email verification workflow after the Person row and
      PersonRole row have already been created by application code.
    */
    if (devBypassEmailVerification) {
      this.logger.warn(
        `DEV_BYPASS_EMAIL_VERIFICATION=true; skipping verification token/email for pid=${saved.pid}`
      );

      return {
        pid: saved.pid,
        emailVerificationToken: "",
      };
    }

    const { token, expiresAt } = this.tokenGen.generateExpiring(60 * 24);

    const tokenEntity = new EmailVerificationToken(
      null,
      saved.pid,
      token,
      new Date(),
      expiresAt
    );

    await this.personRepo.createEmailVerificationToken(tokenEntity);

    if (suppressRegistrationEmail) {
      this.logger.warn(
        `DEV_SUPPRESS_REGISTRATION_EMAIL=true; verification email not sent for pid=${saved.pid}`
      );

      return {
        pid: saved.pid,
        emailVerificationToken: tokenEntity.token,
      };
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is not configured");
    }

    const message: MailMessage = {
      to: saved.emailAddress,
      subject: "Verify Your Email",
      html: `
        <h1>Welcome to Sports Mgmt App</h1>
        <p>Click below to verify your email:</p>
        <a href="${frontendUrl}/verify-email/${token}">
          Verify Email
        </a>
      `,
    };

    await this.mailer.send(message);

    return {
      pid: saved.pid,
      emailVerificationToken: tokenEntity.token,
    };
  }

  private isEnabledDevFlag(name: string): boolean {
    return process.env.NODE_ENV !== "production" && process.env[name] === "true";
  }
}