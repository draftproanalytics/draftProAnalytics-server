// src/bootstrap/auth/authModule.ts

import { AuthController } from '@/presentation/controllers/AuthController';

import {
  registerUseCase,
  loginUseCase,
  refreshTokenUseCase,
  logoutUseCase,
  forgotPasswordUseCase,
  resetPasswordUseCase,
  verifyEmailUseCase,
  loginWithGoogleUseCase,
  loginWithAppleUseCase,
} from '@/infrastructure/dependencies';

export function buildAuthController(): AuthController {
  return new AuthController(
    registerUseCase,
    verifyEmailUseCase,
    loginUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    forgotPasswordUseCase,
    resetPasswordUseCase,
    loginWithGoogleUseCase,
    loginWithAppleUseCase,
  );
}