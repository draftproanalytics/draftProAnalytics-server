import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { EnqueueImportNflGameScoresJobUseCase } from '../../application/use-cases/EnqueueImportNflGameScoresJobUseCase';
import { EnqueueLoadNflSeasonScheduleJobUseCase } from '../../application/use-cases/EnqueueLoadNflSeasonScheduleJobUseCase';
import { ListDpaJobsUseCase } from '../../application/use-cases/ListDpaJobsUseCase';
import { ReadDpaJobUseCase } from '../../application/use-cases/ReadDpaJobUseCase';
import { CancelDpaJobUseCase } from '../../application/use-cases/CancelDpaJobUseCase';
import { ProcessDpaJobQueueUseCase } from '../../application/use-cases/ProcessDpaJobQueueUseCase';
import { DpaJobQueueProcessor } from '../../application/services/DpaJobQueueProcessor';
import { ImportNflGameScoresJobHandler } from '../../application/services/ImportNflGameScoresJobHandler';
import { LoadNflSeasonScheduleJobHandler } from '../../application/services/LoadNflSeasonScheduleJobHandler';
import { EspnNflScheduleProvider } from '../../infrastructure/external/EspnNflScheduleProvider';
import { PrismaDpaTeamIdentityResolver } from '../../infrastructure/persistence/PrismaDpaTeamIdentityResolver';
import { PrismaGameScheduleRepository } from '../../infrastructure/persistence/PrismaGameScheduleRepository';
import { PrismaJobQueueRepository } from '../../infrastructure/persistence/PrismaJobQueueRepository';
import { DpaJobsNflImportController } from '../controllers/DpaJobsNflImportController';

// If your app uses RBAC here, add your existing middleware, for example:
// import { requirePermission } from '@/modules/accessControl/presentation/security/requirePermission';

export const createDpaJobsNflImportRouter = (prisma: PrismaClient): Router => {
  const router = Router();

  const jobQueueRepository = new PrismaJobQueueRepository(prisma);
  const nflScheduleProvider = new EspnNflScheduleProvider();
  const teamIdentityResolver = new PrismaDpaTeamIdentityResolver(prisma);
  const gameScheduleRepository = new PrismaGameScheduleRepository(prisma, teamIdentityResolver);

  const loadNflSeasonScheduleJobHandler = new LoadNflSeasonScheduleJobHandler(
    jobQueueRepository,
    nflScheduleProvider,
    gameScheduleRepository,
  );

  const importNflGameScoresJobHandler = new ImportNflGameScoresJobHandler(
    jobQueueRepository,
    nflScheduleProvider,
    gameScheduleRepository,
  );

  const jobQueueProcessor = new DpaJobQueueProcessor(
    jobQueueRepository,
    loadNflSeasonScheduleJobHandler,
    importNflGameScoresJobHandler,
  );

  const controller = new DpaJobsNflImportController(
    new EnqueueLoadNflSeasonScheduleJobUseCase(jobQueueRepository),
    new EnqueueImportNflGameScoresJobUseCase(jobQueueRepository),
    new ProcessDpaJobQueueUseCase(jobQueueProcessor),
    new ListDpaJobsUseCase(jobQueueRepository),
    new ReadDpaJobUseCase(jobQueueRepository),
    new CancelDpaJobUseCase(jobQueueRepository),
  );

  router.get('/types', controller.readSupportedJobTypes);
  router.get('/', controller.listJobs);
  router.get('/:jobId', controller.readJob);
  router.get('/:jobId/logs', controller.readJobLogs);

  router.post('/imports/nfl-season-schedule', controller.enqueueLoadNflSeasonSchedule);
  router.post('/imports/nfl-game-scores', controller.enqueueImportNflGameScores);
  router.post('/queue/process', controller.processQueue);
  router.post('/:jobId/cancel', controller.cancelJob);

  return router;
};
