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
import { EnqueueImportNflversePlayerProductionJobUseCase } from '../../application/use-cases/EnqueueImportNflversePlayerProductionJobUseCase';
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
import { ImportNflversePlayerProductionJobHandler } from '../../application/services/ImportNflversePlayerProductionJobHandler';
import { EspnDraftProvider } from '../../infrastructure/external/EspnDraftProvider';
import { EspnRosterProvider } from '../../infrastructure/external/EspnRosterProvider';
import { EspnNflScheduleProvider } from '../../infrastructure/external/EspnNflScheduleProvider';
import { NflversePlayerProductionProvider } from '../../infrastructure/external/NflversePlayerProductionProvider';
import { PrismaDpaTeamIdentityResolver } from '../../infrastructure/persistence/PrismaDpaTeamIdentityResolver';
import { PrismaGameScheduleRepository } from '../../infrastructure/persistence/PrismaGameScheduleRepository';
import { PrismaEspnDraftImportRepository } from '../../infrastructure/persistence/PrismaEspnDraftImportRepository';
import { PrismaEspnRosterImportRepository } from '../../infrastructure/persistence/PrismaEspnRosterImportRepository';
import { PrismaJobQueueRepository } from '../../infrastructure/persistence/PrismaJobQueueRepository';
import { PrismaPostSeasonResultSyncRepository } from '../../infrastructure/persistence/PrismaPostSeasonResultSyncRepository';
import { PrismaTeamNeedsGenerationRepository } from '../../infrastructure/persistence/PrismaTeamNeedsGenerationRepository';
import { PrismaNflversePlayerProductionRepository } from '../../infrastructure/persistence/PrismaNflversePlayerProductionRepository';
import { createNflversePlayerProductionRouter } from './nflversePlayerProduction.routes';
import { DpaJobsNflImportController } from '../controllers/DpaJobsNflImportController';

import { PrismaProspectIdentityRepository } from '@/modules/prospectIdentity/infrastructure/PrismaProspectIdentityRepository';
import { DetectProspectDuplicatesJobHandler } from '@/modules/prospectIdentity/application/DetectProspectDuplicatesJobHandler';
import { EnqueueEvaluateB4MeWrProspectsJobUseCase } from '../../application/use-cases/EnqueueEvaluateB4MeWrProspectsJobUseCase';
import { EvaluateB4MeWrProspectsJobHandler } from '../../application/services/EvaluateB4MeWrProspectsJobHandler';
import { PrismaWrImportSeedRepository } from '@/modules/b4meImport/infrastructure/repositories/PrismaWrImportSeedRepository';
import { PrismaProspectLookupRepository } from '@/modules/b4meAnalysis/infrastructure/repositories/PrismaProspectLookupRepository';
import { PrismaB4MeWrMetricsRepository } from '@/modules/b4meAnalysis/infrastructure/repositories/PrismaB4MeWrMetricsRepository';
import { PrismaB4MeEvaluationOrchestratorRepository } from '@/modules/b4meAnalysis/infrastructure/repositories/PrismaB4MeEvaluationOrchestratorRepository';
import { PrismaB4MeFrameworkRepository } from '@/modules/b4meAnalysis/infrastructure/repositories/PrismaB4MeFrameworkRepository';
import { HybridLiveWrProspectProvider } from '@/modules/b4meAnalysis/infrastructure/providers/HybridLiveWrProspectProvider';
import { PrismaProspectWriteRepository } from '@/modules/b4meAnalysis/infrastructure/repositories/PrismaProspectWriteRepository';
import { PrismaB4MeWrMetricsWriteRepository } from '@/modules/b4meAnalysis/infrastructure/repositories/PrismaB4MeWrMetricsWriteRepository';
import { LiveWrProspectIntakeService } from '@/modules/b4meAnalysis/application/services/LiveWrProspectIntakeService';
import { B4MeMethodologyService } from '@/modules/b4meAnalysis/application/services/B4MeMethodologyService';
import { WrB4MeScoringService } from '@/modules/b4meAnalysis/application/services/WrB4MeScoringService';
import { WrEvaluationKeyBuilder } from '@/modules/b4meAnalysis/application/services/WrEvaluationKeyBuilder';
import { requirePermission } from '@/modules/accessControl/presentation/security/requirePermission';
import { requireAuth } from '@/modules/auth/presentation/http/middleware/requireAuth.middleware';

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
  const nflversePlayerProductionRepository = new PrismaNflversePlayerProductionRepository(prisma);
  const nflversePlayerProductionProvider = new NflversePlayerProductionProvider();
  const prospectIdentityRepository = new PrismaProspectIdentityRepository(prisma);

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
  const importNflversePlayerProductionJobHandler = new ImportNflversePlayerProductionJobHandler(jobQueueRepository, nflversePlayerProductionProvider, nflversePlayerProductionRepository);
  const detectProspectDuplicatesJobHandler = new DetectProspectDuplicatesJobHandler(jobQueueRepository, prospectIdentityRepository);
  const b4meSeedRepository = new PrismaWrImportSeedRepository(prisma);
  const b4meProspectRepository = new PrismaProspectLookupRepository(prisma);
  const b4meMetricsRepository = new PrismaB4MeWrMetricsRepository(prisma);
  const b4meEvaluationRepository = new PrismaB4MeEvaluationOrchestratorRepository(prisma);
  const b4meFrameworkRepository = new PrismaB4MeFrameworkRepository(prisma);
  const b4meIntake = new LiveWrProspectIntakeService(
    new HybridLiveWrProspectProvider(),
    new PrismaProspectWriteRepository(prisma),
    new PrismaB4MeWrMetricsWriteRepository(prisma),
    prospectIdentityRepository,
  );
  const b4meProviderConcurrency = Math.max(1, Number.parseInt(process.env.B4ME_WR_PROVIDER_CONCURRENCY ?? '3', 10) || 3);
  const b4meEvaluationJobHandler = new EvaluateB4MeWrProspectsJobHandler(
    jobQueueRepository, b4meSeedRepository, b4meProspectRepository, b4meMetricsRepository,
    b4meEvaluationRepository, prospectIdentityRepository, b4meFrameworkRepository, b4meIntake,
    new B4MeMethodologyService(), new WrB4MeScoringService(), new WrEvaluationKeyBuilder(), b4meProviderConcurrency,
  );

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
    importNflversePlayerProductionJobHandler,
    detectProspectDuplicatesJobHandler,
    b4meEvaluationJobHandler,
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
    new EnqueueImportNflversePlayerProductionJobUseCase(jobQueueRepository),
    new EnqueueEvaluateB4MeWrProspectsJobUseCase(jobQueueRepository),
    new ProcessDpaJobQueueUseCase(jobQueueProcessor),
    new ListDpaJobsUseCase(jobQueueRepository),
    new ReadDpaJobUseCase(jobQueueRepository),
    new CancelDpaJobUseCase(jobQueueRepository),
  );

  router.get('/types', controller.readSupportedJobTypes);
  router.use('/player-production', createNflversePlayerProductionRouter(prisma, nflversePlayerProductionRepository));
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
  router.post('/imports/nflverse-player-production', controller.enqueueImportNflversePlayerProduction);
  router.post('/b4me-wr-evaluation', requireAuth, requirePermission(prisma, 'B4ME_ANALYSIS', 'RUN'), controller.enqueueEvaluateB4MeWrProspects);
  router.post('/queue/process', controller.processQueue);
  router.post('/:jobId/cancel', controller.cancelJob);

  return router;
};
