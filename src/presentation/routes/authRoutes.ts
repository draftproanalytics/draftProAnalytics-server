// src/presentation/routes/authRoutes.ts
import { Router } from "express";
import { AuthController } from "@/presentation/controllers/AuthController";

import { prisma } from "@/infrastructure/database/prisma";
import { PrismaPersonRepository } from "@/infrastructure/repositories/PrismaPersonRepository";
import { MailService } from "@/domain/mail/services/MailService";
import { buildAuthController } from "@/bootstrap/auth/authModule";

const controller = buildAuthController();
export const authRoutes = Router();

authRoutes.post("/register", controller.register.bind(controller));
authRoutes.get("/verify-email/:token", controller.verifyEmail.bind(controller));
authRoutes.post("/login", controller.login.bind(controller));
authRoutes.post("/refresh", controller.refresh.bind(controller));
authRoutes.post("/logout", controller.logout.bind(controller));
authRoutes.post("/forgot-password", controller.forgotPassword.bind(controller));
authRoutes.post("/reset-password", controller.resetPassword.bind(controller));
authRoutes.post('/google', controller.loginWithGoogle.bind(controller));
authRoutes.post('/apple', controller.loginWithApple.bind(controller));

