// src/modules/rosterSync/presentation/routes/rosterSync.routes.ts

import { Router } from 'express';
import { RosterSyncController } from '../controllers/RosterSync.controller';

export function createRosterSyncRoutes(
  controller: RosterSyncController
): Router {
  const router = Router();

  // Get sync status
  router.get('/status', controller.getRosterSyncStatus);

  // Sync all teams
  router.post('/all', controller.syncAllTeamRosters);

  // Sync specific team
  router.post('/team/:teamId', controller.syncTeamRoster);

  return router;
}