import type { PrismaClient } from '@prisma/client';
import { PrismaB4MeFrameworkRepository } from '../repositories/PrismaB4MeFrameworkRepository';
import { PrismaProspectLookupRepository } from '../repositories/PrismaProspectLookupRepository';
import { PrismaB4MeEvaluationOrchestratorRepository } from '../repositories/PrismaB4MeEvaluationOrchestratorRepository';
import { B4MeMethodologyService } from '../../application/services/B4MeMethodologyService';
import { WrEvaluationKeyBuilder } from '../../application/services/WrEvaluationKeyBuilder';
import { GetOrCreateWrB4MeEvaluationUseCase } from '../../application/usecases/GetOrCreateWrB4MeEvaluationUseCase';
import { GetB4MeEvaluationUseCase } from '../../application/usecases/GetB4MeEvaluationUseCase';
import { B4MeAnalysisController } from '../../presentation/controllers/B4MeAnalysisController';

import { PrismaB4MeWrMetricsWriteRepository } from '../repositories/PrismaB4MeWrMetricsWriteRepository';
import { SaveManualWrObservedMetricsUseCase } from '../../application/usecases/SaveManualWrObservedMetricsUseCase';


export const createB4MeAnalysisModule = (prisma: PrismaClient): B4MeAnalysisController => {
  const frameworkRepository = new PrismaB4MeFrameworkRepository(prisma);
  const prospectRepository = new PrismaProspectLookupRepository(prisma);
  const wrMetricsWriteRepository = new PrismaB4MeWrMetricsWriteRepository(prisma);
  const evaluationRepository = new PrismaB4MeEvaluationOrchestratorRepository(prisma);

  const methodologyService = new B4MeMethodologyService();
  const keyBuilder = new WrEvaluationKeyBuilder();

  const wrUseCase = new GetOrCreateWrB4MeEvaluationUseCase(
    frameworkRepository,
    prospectRepository,
    evaluationRepository,
    methodologyService,
    keyBuilder
  );

  const getUseCase = new GetB4MeEvaluationUseCase(wrUseCase);
  const saveManualMetricsUseCase = new SaveManualWrObservedMetricsUseCase(
    prisma,
    wrMetricsWriteRepository,
    evaluationRepository
  );

  return new B4MeAnalysisController(getUseCase, saveManualMetricsUseCase);
};

