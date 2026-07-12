import type { PrismaClient } from '@prisma/client';
import { PrismaB4MeFrameworkRepository } from '../repositories/PrismaB4MeFrameworkRepository';
import { PrismaProspectLookupRepository } from '../repositories/PrismaProspectLookupRepository';
import { PrismaB4MeWrMetricsRepository } from '../repositories/PrismaB4MeWrMetricsRepository';
import { PrismaB4MeEvaluationOrchestratorRepository } from '../repositories/PrismaB4MeEvaluationOrchestratorRepository';
import { B4MeMethodologyService } from '../../application/services/B4MeMethodologyService';
import { WrB4MeScoringService } from '../../application/services/WrB4MeScoringService';
import { WrEvaluationKeyBuilder } from '../../application/services/WrEvaluationKeyBuilder';
import { GetOrCreateWrB4MeEvaluationUseCase } from '../../application/usecases/GetOrCreateWrB4MeEvaluationUseCase';
import { GetB4MeEvaluationUseCase } from '../../application/usecases/GetB4MeEvaluationUseCase';
import { B4MeAnalysisController } from '../../presentation/controllers/B4MeAnalysisController';

import { PrismaProspectWriteRepository } from '../repositories/PrismaProspectWriteRepository';
import { PrismaB4MeWrMetricsWriteRepository } from '../repositories/PrismaB4MeWrMetricsWriteRepository';
import { NullLiveWrProspectProvider } from '../providers/NullLiveWrProspectProvider';
import { LiveWrProspectIntakeService } from '../../application/services/LiveWrProspectIntakeService';
import { HybridLiveWrProspectProvider } from '../providers/HybridLiveWrProspectProvider';


export const createB4MeAnalysisModule = (prisma: PrismaClient): B4MeAnalysisController => {
  const frameworkRepository = new PrismaB4MeFrameworkRepository(prisma);
  const prospectRepository = new PrismaProspectLookupRepository(prisma);
  const prospectWriteRepository = new PrismaProspectWriteRepository(prisma);
  const metricsRepository = new PrismaB4MeWrMetricsRepository(prisma);
  const wrMetricsWriteRepository = new PrismaB4MeWrMetricsWriteRepository(prisma);
  const evaluationRepository = new PrismaB4MeEvaluationOrchestratorRepository(prisma);
  const liveProvider = new HybridLiveWrProspectProvider();

  const methodologyService = new B4MeMethodologyService();
  const scoringService = new WrB4MeScoringService();
  const keyBuilder = new WrEvaluationKeyBuilder();

  const liveWrProspectIntakeService = new LiveWrProspectIntakeService(
    liveProvider,
    prospectWriteRepository,
    wrMetricsWriteRepository
  );

  const wrUseCase = new GetOrCreateWrB4MeEvaluationUseCase(
    frameworkRepository,
    prospectRepository,
    metricsRepository,
    evaluationRepository,
    methodologyService,
    scoringService,
    keyBuilder,
    liveWrProspectIntakeService
  );

  const getUseCase = new GetB4MeEvaluationUseCase(wrUseCase);

  return new B4MeAnalysisController(getUseCase);
};

