// src/presentation/controllers/AuthController.ts
import { NextFunction, Request, Response } from 'express';
import {
  verifyEmailUseCase,
  refreshTokenUseCase,
  forgotPasswordUseCase,
  resetPasswordUseCase,
  registerUseCase,
  loginUseCase,
  loginWithAppleUseCase,
  loginWithGoogleUseCase,
  logoutUseCase,
} from '@/infrastructure/dependencies';
import { RegisterInputDTO } from '@/application/auth/register/RegisterDTO';
import { ForgotPasswordUseCase } from '@/application/auth/forgot-password/ForgotPasswordUseCase';
import { LoginUseCase } from '@/application/auth/login/LoginUseCase';
import { LoginWithAppleUseCase } from '@/application/auth/login/loginWithAppleUseCase';
import { LoginWithGoogleUseCase } from '@/application/auth/login/LoginWithGoogleUseCase';
import { LogoutUseCase } from '@/application/auth/logout/LogoutUseCase';
import { RefreshTokenUseCase } from '@/application/auth/refresh/RefreshTokenUseCase';
import { RegisterUseCase } from '@/application/auth/register/RegisterUseCase';
import { ResetPasswordUseCase } from '@/application/auth/reset-password/ResetPasswordUseCase';
import { VerifyEmailUseCase } from '@/application/auth/verify-email/VerifyEmailUseCase';

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly loginWithGoogleUseCase: LoginWithGoogleUseCase,
    private readonly loginWithAppleUseCase: LoginWithAppleUseCase
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { userName, password } = req.body as { userName: string; password: string };

      const result = await loginUseCase.execute({ userName, password });

      //res.status(200).json(result);
      // right now LoginResponseDTO = { accessToken, personId, userName }
      // Your frontend only cares about accessToken.
      res.status(200).json({
        accessToken: result.accessToken,
        personId: result.personId,
        userName: result.userName,
      });
    } catch (err) {
      console.error('[login] error:', err);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    console.log('REGISTER body:', req.body);

    try {
      const input = req.body as RegisterInputDTO;

      // optional basic validation
      if (!input.userName || !input.emailAddress || !input.password) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await registerUseCase.execute(input);
      res.status(201).json(result);
    } catch (err: unknown) {
      const e = err as Error;
      console.error('REGISTER error:', e);
      res.status(400).json({ error: e.message });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      await verifyEmailUseCase.execute(token);
      res.json({ message: 'Email verified successfully' });
    } catch (err: unknown) {
      const e = err as Error;
      res.status(400).json({ error: e.message });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      const personId = Number(req.body.personId);

      if (!refreshToken) {
        res.status(400).json({ error: 'Missing refresh token' });
        return;
      }

      const result = await refreshTokenUseCase.execute(refreshToken, personId);

      // Rotate cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ accessToken: result.accessToken });
    } catch (err: unknown) {
      const e = err as Error;
      res.status(400).json({ error: e.message });
    }
  }
  /*
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      const personId = Number(req.body.personId);

      if (refreshToken) {
        await logoutUseCase.execute(refreshToken, personId);
      }

      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out' });
    } catch (err: unknown) {
      const e = err as Error;
      console.error('[logout] error:', e);
      res.status(400).json({ error: e.message });
    }
  }
*/
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.body?.refreshToken ?? req.cookies?.refreshToken ?? null;
      const personId = Number(req.body.personId);

      await this.logoutUseCase.execute(refreshToken, personId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      await forgotPasswordUseCase.execute(email);
      res.json({ message: 'If a user exists with that email, a link was sent.' });
    } catch (err: unknown) {
      const e = err as Error;
      res.status(400).json({ error: e.message });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await resetPasswordUseCase.execute(token, newPassword);
      res.json({ message: 'Password updated' });
    } catch (err: unknown) {
      const e = err as Error;
      res.status(400).json({ error: e.message });
    }
  }
  // ─────────────────────────
  // SOCIAL LOGIN: GOOGLE
  // ─────────────────────────
  async loginWithGoogle(req: Request, res: Response): Promise<void> {
    try {
      const { credential } = req.body as { credential?: string };

      if (!credential) {
        res.status(400).json({ error: 'Missing Google credential' });
        return;
      }

      const result = await loginWithGoogleUseCase.execute({ credential });

      res.status(200).json({
        accessToken: result.accessToken,
        personId: result.personId,
        userName: result.userName,
      });
    } catch (err) {
      const e = err as Error;
      console.error('[loginWithGoogle] error:', e);
      res.status(401).json({ error: e.message || 'Google auth failed' });
    }
  }

  // ─────────────────────────
  // SOCIAL LOGIN: APPLE
  // ─────────────────────────
  async loginWithApple(req: Request, res: Response): Promise<void> {
    try {
      const { credential } = req.body as { credential?: string };

      if (!credential) {
        res.status(400).json({ error: 'Missing Apple credential' });
        return;
      }

      const result = await loginWithAppleUseCase.execute({ credential });

      res.status(200).json({
        accessToken: result.accessToken,
        personId: result.personId,
        userName: result.userName,
      });
    } catch (err) {
      const e = err as Error;
      console.error('[loginWithApple] error:', e);
      res.status(401).json({ error: e.message || 'Apple auth failed' });
    }
  }
}
