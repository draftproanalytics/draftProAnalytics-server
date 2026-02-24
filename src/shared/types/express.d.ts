// draftproanalytics-server/src/shared/types/express.d.ts
import "express-serve-static-core";
import { AuthUser } from "../presentation/http/authUser";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}
