import type { AuthUser } from "@/shared/presentation/http/AuthUser";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
