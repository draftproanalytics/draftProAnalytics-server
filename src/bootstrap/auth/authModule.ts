// src/bootstrap/authModule.ts
import { prisma } from "@/infrastructure/database/prisma";

import { AuthController } from '@/presentation/controllers/AuthController';
import { RegisterUseCase } from '@/application/auth/register/RegisterUseCase';

import { PrismaPersonRepository } from '@/infrastructure/repositories/PrismaPersonRepository';
import { BcryptPasswordHasher } from '@/infrastructure/auth/BcryptPasswordHasher';
import { SecureTokenGeneratorImpl } from '@/infrastructure/auth/SecureTokenGeneratorImpl';
import { SendGridMailService } from '@/infrastructure/mail/SendGridMailService';
import { createMailService } from '@/infrastructure/mail/MailServiceFactory';

import { LoginUseCase } from '@/application/auth/login/LoginUseCase';
import { JwtTokenService } from "@/modules/auth/infrastructure/security/JwtTokenService";


export function buildAuthController(): AuthController {
  
  const personRepo = new PrismaPersonRepository(prisma);

  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService();

  const tokenSecret =
    process.env.SECURE_TOKEN_SECRET ?? process.env.JWT_SECRET ?? '';
  const tokenGen = new SecureTokenGeneratorImpl(tokenSecret);

  const defaultFrom =
    process.env.EMAIL_FROM ?? 'no-reply@sportsmgmtapp.local';
  //const mailer = new SendGridMailService(defaultFrom);
  const mailer = createMailService();

  const registerUseCase = new RegisterUseCase(
    personRepo,
    passwordHasher,
    tokenGen,
    mailer
  );

  const loginUseCase = new LoginUseCase(
    personRepo,
    passwordHasher,
    tokenService
  );

  return new AuthController();
}


