import { Router } from "express";
import { TeamNeedsController } from "./TeamNeedsController";
import { TeamTalentController } from "./TeamTalentController";

export function buildTeamNeedsRouter(controller: TeamNeedsController, talent?: TeamTalentController): Router {
  const router = Router();

  router.get("/teams/:teamId/needs-page", controller.getNeedsPage);
  router.put("/teams/:teamId/team-needs", controller.upsertTeamNeed);
  router.patch('/team-needs/:id/approve', controller.approveTeamNeed);
  router.patch('/team-needs/:id/reject', controller.rejectTeamNeed);
  router.delete("/teams/:teamId/team-needs/:position", controller.deleteTeamNeed);
  if (talent) {
    router.get('/team-needs/context-catalog', talent.listCatalog);
    router.get('/teams/:teamId/roster-players', talent.listRosterPlayers);
    router.get('/teams/:teamId/player-evaluations', talent.listPlayerEvaluations);
    router.put('/player-evaluations', talent.savePlayerEvaluation);
    router.delete('/player-evaluations/:id', talent.deletePlayerEvaluation);
    router.get('/teams/:teamId/position-contexts', talent.listContexts);
    router.put('/team-position-contexts', talent.saveContext);
    router.delete('/team-position-contexts/:id', talent.deleteContext);
    router.get('/teams/:teamId/position-assessments', talent.listAssessments);
    router.put('/team-position-assessments', talent.saveAssessment);
    router.delete('/team-position-assessments/:id', talent.deleteAssessment);
  }


  return router;
}

