// src/modules/rosterSync/index.ts

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RosterSyncService } from './application/services/RosterSync.service';
import { RosterSyncController } from './presentation/controllers/RosterSync.controller';
import { createRosterSyncRoutes } from './presentation/routes/rosterSync.routes';

/**
 * Bootstrap the RosterSync module
 * 
 * @param prismaClient - Shared PrismaClient instance
 * @returns Express Router with all module routes
 */
export function bootstrapRosterSyncModule(prismaClient: PrismaClient): Router {
  // Create service
  const service = new RosterSyncService(prismaClient);
  
  // Create controller
  const controller = new RosterSyncController(service);
  
  // Create and return routes
  return createRosterSyncRoutes(controller);
}

// Export public interfaces
export { RosterSyncService } from './application/services/RosterSync.service';
export { RosterSyncController } from './presentation/controllers/RosterSync.controller';
export type { RosterSyncResult, BulkSyncResult } from './application/services/RosterSync.service';