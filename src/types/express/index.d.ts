import "express";
import "express-serve-static-core";
import type { AuthUser } from "../../shared/presentation/http/authUser"; // adjust relative path if needed

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export {};
