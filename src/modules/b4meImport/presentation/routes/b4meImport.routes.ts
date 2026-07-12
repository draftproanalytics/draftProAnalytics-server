import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import { createB4MeImportModule } from '../../infrastructure/factories/createB4MeImportModule';

export const createB4MeImportRouter = (prisma: PrismaClient): Router => {
  const router = Router();
  const controller = createB4MeImportModule(prisma);

  router.post(
    '/jobs/wr/year',
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        await controller.createWrYearJob(request, response);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/jobs/wr/player',
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        await controller.createWrPlayerJob(request, response);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/jobs/:id/run',
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        await controller.runJob(request, response);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/jobs/:id',
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        await controller.getJob(request, response);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/jobs/:id/logs',
    async (request: Request, response: Response, next: NextFunction): Promise<void> => {
      try {
        await controller.getJobLogs(request, response);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
