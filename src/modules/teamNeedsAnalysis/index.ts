// src/modules/teamNeedsAnalysis/index.ts

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getContainer } from './infrastructure/di/container';
import { createTeamNeedsAnalysisRoutes } from './presentation/routes/teamNeedsAnalysis.routes';

/**
 * Bootstrap the TeamNeedsAnalysis module
 * 
 * @param prismaClient - Shared PrismaClient instance
 * @returns Express Router with all module routes
 */
export function bootstrapTeamNeedsAnalysisModule(prismaClient: PrismaClient): Router {
  // Initialize container with dependencies
  const container = getContainer();
  container.setPrismaClient(prismaClient);

  // Get controller
  const controller = container.getController();

  // Create and return routes
  return createTeamNeedsAnalysisRoutes(controller);
}

// Export public interfaces and types
export { TeamNeedsAnalysisService } from './application/services/TeamNeedsAnalysisService';
export { TeamNeedsAnalysisController } from './presentation/controllers/TeamNeedsAnalysisController';
export * from './application/dto/TeamNeedsAnalysis.dto';
export { TeamNeedsAnalysis } from './domain/entities/teamNeedsAnalysis.entity';
export { getContainer as getTeamNeedsAnalysisContainer } from './infrastructure/di/container';