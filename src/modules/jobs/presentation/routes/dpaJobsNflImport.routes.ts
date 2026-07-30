// src/modules/jobs/presentation/routes/dpaJobNflImport.routes.ts
import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { EnqueueImportNflGameScoresJobUseCase } from '../../application/use-cases/EnqueueImportNflGameScoresJobUseCase';
import { EnqueueLoadEspnDraftClassPlayersJobUseCase } from '../../application/use-cases/EnqueueLoadEspnDraftClassPlayersJobUseCase';
import { EnqueueLoadEspnDraftResultsJobUseCase } from '../../application/use-cases/EnqueueLoadEspnDraftResultsJobUseCase';
import { EnqueueSyncEspnDraftPicksToDpaJobUseCase } from '../../application/use-cases/EnqueueSyncEspnDraftPicksToDpaJobUseCase';
import { EnqueueEnrichPlayerTeamPositionsJobUseCase } from '../../application/use-cases/EnqueueEnrichPlayerTeamPositionsJobUseCase';
import { EnqueueLoadEspnTeamRostersJobUseCase } from '../../application/use-cases/EnqueueLoadEspnTeamRostersJobUseCase';
import { EnqueueLoadNflSeasonScheduleJobUseCase } from '../../application/use-cases/EnqueueLoadNflSeasonScheduleJobUseCase';
import { EnqueueSyncPostSeasonResultsJobUseCase } from '../../application/use-cases/EnqueueSyncPostSeasonResultsJobUseCase';
import { EnqueueGenerateTeamNeedsJobUseCase } from '../../application/use-cases/EnqueueGenerateTeamNeedsJobUseCase';
import { ListDpaJobsUseCase } from '../../application/use-cases/ListDpaJobsUseCase';
import { ReadDpaJobUseCase } from '../../application/use-cases/ReadDpaJobUseCase';
import { CancelDpaJobUseCase } from '../../application/use-cases/CancelDpaJobUseCase';
import { ProcessDpaJobQueueUseCase } from '../../application/use-cases/ProcessDpaJobQueueUseCase';
import { DpaJobQueueProcessor } from '../../application/services/DpaJobQueueProcessor';
import { ImportNflGameScoresJobHandler } from '../../application/services/ImportNflGameScoresJobHandler';
import { LoadEspnDraftClassPlayersJobHandler } from '../../application/services/LoadEspnDraftClassPlayersJobHandler';
import { LoadEspnDraftResultsJobHandler } from '../../application/services/LoadEspnDraftResultsJobHandler';
import { SyncEspnDraftPicksToDpaJobHandler } from '../../application/services/SyncEspnDraftPicksToDpaJobHandler';
import { EnrichPlayerTeamPositionsJobHandler } from '../../application/services/EnrichPlayerTeamPositionsJobHandler';
import { LoadEspnTeamRostersJobHandler } from '../../application/services/LoadEspnTeamRostersJobHandler';
import { LoadNflSeasonScheduleJobHandler } from '../../application/services/LoadNflSeasonScheduleJobHandler';
import { SyncPostSeasonResultsJobHandler } from '../../application/services/SyncPostSeasonResultsJobHandler';
import { GenerateTeamNeedsJobHandler } from '../../application/services/GenerateTeamNeedsJobHandler';
import { EspnDraftProvider } from '../../infrastructure/external/EspnDraftProvider';
import { EspnRosterProvider } from '../../infrastructure/external/EspnRosterProvider';
import { EspnNflScheduleProvider } from '../../infrastructure/external/EspnNflScheduleProvider';
import { PrismaDpaTeamIdentityResolver } from '../../infrastructure/persistence/PrismaDpaTeamIdentityResolver';
import { PrismaGameScheduleRepository } from '../../infrastructure/persistence/PrismaGameScheduleRepository';
import { PrismaEspnDraftImportRepository } from '../../infrastructure/persistence/PrismaEspnDraftImportRepository';
import { PrismaEspnRosterImportRepository } from '../../infrastructure/persistence/PrismaEspnRosterImportRepository';
import { PrismaJobQueueRepository } from '../../infrastructure/persistence/PrismaJobQueueRepository';
import { PrismaPostSeasonResultSyncRepository } from '../../infrastructure/persistence/PrismaPostSeasonResultSyncRepository';
import { PrismaTeamNeedsGenerationRepository } from '../../infrastructure/persistence/PrismaTeamNeedsGenerationRepository';
import { DpaJobsNflImportController } from '../controllers/DpaJobsNflImportController';

// If your app uses RBAC here, add your existing middleware, for example:
// import { requirePermission } from '@/modules/accessControl/presentation/security/requirePermission';

export const createDpaJobsNflImportRouter = (prisma: PrismaClient): Router => {
  const router = Router();

  const jobQueueRepository = new PrismaJobQueueRepository(prisma);
  const nflScheduleProvider = new EspnNflScheduleProvider();
  const espnDraftProvider = new EspnDraftProvider();
  const espnRosterProvider = new EspnRosterProvider();
  const espnDraftImportRepository = new PrismaEspnDraftImportRepository(prisma);
  const espnRosterImportRepository = new PrismaEspnRosterImportRepository(prisma);
  const teamIdentityResolver = new PrismaDpaTeamIdentityResolver(prisma);
  const gameScheduleRepository = new PrismaGameScheduleRepository(prisma, teamIdentityResolver);
  const postSeasonResultSyncRepository = new PrismaPostSeasonResultSyncRepository(prisma);
  const teamNeedsGenerationRepository = new PrismaTeamNeedsGenerationRepository(prisma);

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

  const loadEspnDraftClassPlayersJobHandler = new LoadEspnDraftClassPlayersJobHandler(jobQueueRepository, espnDraftProvider, espnDraftImportRepository);
  const loadEspnDraftResultsJobHandler = new LoadEspnDraftResultsJobHandler(jobQueueRepository, espnDraftProvider, espnDraftImportRepository);
  const syncEspnDraftPicksToDpaJobHandler = new SyncEspnDraftPicksToDpaJobHandler(jobQueueRepository, espnDraftImportRepository);
  const enrichPlayerTeamPositionsJobHandler = new EnrichPlayerTeamPositionsJobHandler(jobQueueRepository, espnDraftProvider, espnDraftImportRepository);
  const loadEspnTeamRostersJobHandler = new LoadEspnTeamRostersJobHandler(jobQueueRepository, espnRosterProvider, espnRosterImportRepository);
  const syncPostSeasonResultsJobHandler = new SyncPostSeasonResultsJobHandler(jobQueueRepository, postSeasonResultSyncRepository);
  const generateTeamNeedsJobHandler = new GenerateTeamNeedsJobHandler(jobQueueRepository, teamNeedsGenerationRepository);

  const jobQueueProcessor = new DpaJobQueueProcessor(
    jobQueueRepository,
    loadNflSeasonScheduleJobHandler,
    importNflGameScoresJobHandler,
    loadEspnDraftClassPlayersJobHandler,
    loadEspnDraftResultsJobHandler,
    enrichPlayerTeamPositionsJobHandler,
    syncEspnDraftPicksToDpaJobHandler,
    loadEspnTeamRostersJobHandler,
    syncPostSeasonResultsJobHandler,
    generateTeamNeedsJobHandler,
  );

  const controller = new DpaJobsNflImportController(
    new EnqueueLoadNflSeasonScheduleJobUseCase(jobQueueRepository),
    new EnqueueImportNflGameScoresJobUseCase(jobQueueRepository),
    new EnqueueLoadEspnDraftClassPlayersJobUseCase(jobQueueRepository),
    new EnqueueLoadEspnDraftResultsJobUseCase(jobQueueRepository),
    new EnqueueEnrichPlayerTeamPositionsJobUseCase(jobQueueRepository),
    new EnqueueSyncEspnDraftPicksToDpaJobUseCase(jobQueueRepository),
    new EnqueueLoadEspnTeamRostersJobUseCase(jobQueueRepository),
    new EnqueueSyncPostSeasonResultsJobUseCase(jobQueueRepository),
    new EnqueueGenerateTeamNeedsJobUseCase(jobQueueRepository),
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
  router.post('/imports/espn-draft-class-players', controller.enqueueLoadEspnDraftClassPlayers);
  router.post('/imports/espn-draft-results', controller.enqueueLoadEspnDraftResults);
  router.post('/imports/player-team-positions', controller.enqueueEnrichPlayerTeamPositions);
  router.post('/imports/espn-draft-picks/sync', controller.enqueueSyncEspnDraftPicksToDpa);
  router.post('/imports/espn-team-rosters', controller.enqueueLoadEspnTeamRosters);
  router.post('/imports/postseason-results/sync', controller.enqueueSyncPostSeasonResults);
  router.post('/team-needs/generate', controller.enqueueGenerateTeamNeeds);
  router.post('/queue/process', controller.processQueue);
  router.post('/:jobId/cancel', controller.cancelJob);

  return router;
};
