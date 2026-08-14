import type { PrismaClient } from '@prisma/client';
import { PrismaJobRepository } from '../repositories/PrismaJobRepository';
import { PrismaJobLogRepository } from '../repositories/PrismaJobLogRepository';
import { PrismaWrImportSeedRepository } from '../repositories/PrismaWrImportSeedRepository';
import { CfbdWrProspectListProvider } from '../providers/CfbdWrProspectListProvider';
import { CreateWrImportJobUseCase } from '../../application/usecases/CreateWrImportJob.usecase';
import { RunWrImportJobUseCase } from '../../application/usecases/RunWrImportJob.usecase';
import { WrImportOrchestratorService } from '../../application/services/WrImportOrchestratorService';
import { B4MeImportController } from '../../presentation/controllers/B4MeImportController';

import { PrismaB4MeFrameworkRepository } from '../../../b4meAnalysis/infrastructure/repositories/PrismaB4MeFrameworkRepository';
import { PrismaProspectLookupRepository } from '../../../b4meAnalysis/infrastructure/repositories/PrismaProspectLookupRepository';
import { PrismaB4MeWrMetricsRepository } from '../../../b4meAnalysis/infrastructure/repositories/PrismaB4MeWrMetricsRepository';
import { PrismaB4MeEvaluationOrchestratorRepository } from '../../../b4meAnalysis/infrastructure/repositories/PrismaB4MeEvaluationOrchestratorRepository';
import { B4MeMethodologyService } from '../../../b4meAnalysis/application/services/B4MeMethodologyService';
import { WrB4MeScoringService } from '../../../b4meAnalysis/application/services/WrB4MeScoringService';
import { WrEvaluationKeyBuilder } from '../../../b4meAnalysis/application/services/WrEvaluationKeyBuilder';
import { LiveWrProspectIntakeService } from '../../../b4meAnalysis/application/services/LiveWrProspectIntakeService';
import { HybridLiveWrProspectProvider } from '../../../b4meAnalysis/infrastructure/providers/HybridLiveWrProspectProvider';
import { PrismaProspectWriteRepository } from '../../../b4meAnalysis/infrastructure/repositories/PrismaProspectWriteRepository';
import { PrismaB4MeWrMetricsWriteRepository } from '../../../b4meAnalysis/infrastructure/repositories/PrismaB4MeWrMetricsWriteRepository';
import { PrismaProspectIdentityRepository } from '../../../prospectIdentity/infrastructure/PrismaProspectIdentityRepository';

export const createB4MeImportModule = (prisma: PrismaClient): B4MeImportController => {
  const jobRepository = new PrismaJobRepository(prisma);
  const jobLogRepository = new PrismaJobLogRepository(prisma);
  const wrImportSeedRepository = new PrismaWrImportSeedRepository(prisma);
  const listProvider = new CfbdWrProspectListProvider();

  const frameworkRepository = new PrismaB4MeFrameworkRepository(prisma);
  const prospectRepository = new PrismaProspectLookupRepository(prisma);
  const metricsRepository = new PrismaB4MeWrMetricsRepository(prisma);
  const evaluationRepository = new PrismaB4MeEvaluationOrchestratorRepository(prisma);

  const methodologyService = new B4MeMethodologyService();
  const scoringService = new WrB4MeScoringService();
  const evaluationKeyBuilder = new WrEvaluationKeyBuilder();

  const liveProvider = new HybridLiveWrProspectProvider();
  const prospectWriteRepository = new PrismaProspectWriteRepository(prisma);
  const wrMetricsWriteRepository = new PrismaB4MeWrMetricsWriteRepository(prisma);
  const prospectIdentityRepository = new PrismaProspectIdentityRepository(prisma);

  const liveWrProspectIntakeService = new LiveWrProspectIntakeService(
    liveProvider,
    prospectWriteRepository,
    wrMetricsWriteRepository,
    prospectIdentityRepository
  );

  const orchestrator = new WrImportOrchestratorService(
    frameworkRepository,
    prospectRepository,
    metricsRepository,
    evaluationRepository,
    methodologyService,
    scoringService,
    evaluationKeyBuilder,
    liveWrProspectIntakeService,
    jobLogRepository,
    listProvider,
    wrImportSeedRepository
  );

  const createJobUseCase = new CreateWrImportJobUseCase(jobRepository);
  const runJobUseCase = new RunWrImportJobUseCase(
    jobRepository,
    jobLogRepository,
    orchestrator
  );

  return new B4MeImportController(
    createJobUseCase,
    runJobUseCase,
    jobRepository,
    jobLogRepository
  );
};