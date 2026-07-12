// src/presentation/routes/buildDpaApiRouter.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createDpaJobsNflImportRouter } from '@/modules/jobs/presentation/routes/dpaJobsNflImport.routes';

export const buildDpaApiRouter = (prisma: PrismaClient): Router => {
  const router = Router();
  router.use('/jobs', createDpaJobsNflImportRouter(prisma));
  return router;
};