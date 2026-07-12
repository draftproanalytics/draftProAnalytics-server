// src/modules/teamNeedsAnalysis/presentation/routes/teamNeedsAnalysis.routes.ts

import { Router } from 'express';
import { TeamNeedsAnalysisController } from '../controllers/TeamNeedsAnalysisController';

export function createTeamNeedsAnalysisRoutes(
  controller: TeamNeedsAnalysisController
): Router {
  const router = Router();
  // http://localhost:5000/api/team-needs/datatable/teams/2026
  // http://localhost:5000/api/team-needs/datatable/teams/:year
  // Generate analysis
  router.post('/generate', controller.generateTeamNeeds);
  router.post('/generate-all', controller.generateAllTeamsNeeds);

  // Get analysis
  router.get('/season/:year', controller.getAllTeamsNeeds);
  router.get('/:teamId', controller.getTeamNeeds);

  // DataTable endpoints
  router.get('/datatable/teams/:year', controller.getTeamsNeedsDataTable);
  router.get('/datatable/positions/:year', controller.getPositionNeedsDataTable);

  return router;
}