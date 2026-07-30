import { PrismaClient } from "@prisma/client";
import { TeamNeedsAnalyzerService } from "./domain/services/TeamNeedsAnalyzerService";
import { PrismaTeamNeedRepository } from "./infrastructure/repositories/PrismaTeamNeedRepository";
import { PrismaTeamRosterRepository } from "./infrastructure/repositories/PrismaTeamRosterRepository";
import { GetTeamNeedsPageUseCase } from "./application/usecases/GetTeamNeedsPageUseCase";
import { UpsertTeamNeedUseCase } from "./application/usecases/UpsertTeamNeedUseCase";
import { DeleteTeamNeedUseCase } from "./application/usecases/DeleteTeamNeedUseCase";
import { ReviewTeamNeedUseCase } from './application/usecases/ReviewTeamNeedUseCase';
import { TeamNeedsController } from "./presentation/http/TeamNeedsController";
import { TeamTalentController } from "./presentation/http/TeamTalentController";
import { buildTeamNeedsRouter } from "./presentation/http/teamNeedsRoutes";
import { Router } from "express";

export function buildTeamsRouter(prisma: PrismaClient): Router {
  const router = Router();

  // ...existing teams routes

  const teamNeedRepo = new PrismaTeamNeedRepository(prisma);
  const rosterRepo = new PrismaTeamRosterRepository(prisma);
  const analyzer = new TeamNeedsAnalyzerService();

  const getPage = new GetTeamNeedsPageUseCase(teamNeedRepo, rosterRepo, analyzer);
  const upsert = new UpsertTeamNeedUseCase(teamNeedRepo);
  const del = new DeleteTeamNeedUseCase(teamNeedRepo);
  const review = new ReviewTeamNeedUseCase(teamNeedRepo);

  const controller = new TeamNeedsController(getPage, upsert, del, review);
  const talentController = new TeamTalentController(prisma);
  router.use(buildTeamNeedsRouter(controller, talentController));

  return router;
}
