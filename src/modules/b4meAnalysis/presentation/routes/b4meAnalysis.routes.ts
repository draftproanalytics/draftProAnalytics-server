import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createB4MeAnalysisModule } from '../../infrastructure/factories/createB4MeAnalysisModule';

export const createB4MeAnalysisRouter = (prisma: PrismaClient): Router => {
  const router = Router();
  const controller = createB4MeAnalysisModule(prisma);

  router.get(
    '/prospects',
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        await controller.search(request, response);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/prospects/:id',
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        await controller.getById(request, response);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
/*
Support for these are needed:
GET /api/b4me/prospects?playerName=Boston&draftYear=2026&scoringMode=BASE_PLUS_CONTEXT
GET /api/b4me/prospects?draftYear=2026&scoringMode=FULL_DECISION_SCORE&enableRvaAdjustment=true
GET /api/b4me/prospects?playerName=Sarratt&scoringMode=BASE_ONLY
*/