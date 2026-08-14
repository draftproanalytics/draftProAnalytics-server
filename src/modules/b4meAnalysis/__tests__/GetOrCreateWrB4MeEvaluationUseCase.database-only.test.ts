import { describe, expect, it, vi } from 'vitest';
import { GetOrCreateWrB4MeEvaluationUseCase } from '../application/usecases/GetOrCreateWrB4MeEvaluationUseCase';
import { B4MeMethodologyService } from '../application/services/B4MeMethodologyService';
import { WrEvaluationKeyBuilder } from '../application/services/WrEvaluationKeyBuilder';

describe('GetOrCreateWrB4MeEvaluationUseCase database-only reads', () => {
  it('returns only persisted evaluations and performs no hydration work', async () => {
    const frameworkRepository = {
      findActiveWrFramework: vi.fn().mockResolvedValue({
        id: 1n,
        frameworkVersion: 'wr-test-v1',
        frameworkType: 'WR',
        methodologyLineage: 'test',
        validationStatus: 'VALIDATED',
        validationNote: null,
        knownLimitations: null,
        scoringModeDefault: 'BASE_PLUS_CONTEXT',
      }),
    };
    const prospectRepository = {
      searchWideReceivers: vi.fn().mockResolvedValue([
        { id: 101, playerName: 'Test Receiver', school: 'Test U', draftYear: 2026, position: 'WR' },
      ]),
    };
    const evaluationRepository = {
      findStoredWrEvaluation: vi.fn().mockResolvedValue(null),
    };

    const useCase = new GetOrCreateWrB4MeEvaluationUseCase(
      frameworkRepository as never,
      prospectRepository as never,
      evaluationRepository as never,
      new B4MeMethodologyService(),
      new WrEvaluationKeyBuilder(),
    );

    const result = await useCase.execute({
      playerName: null,
      draftYear: 2026,
      scoringMode: 'BASE_PLUS_CONTEXT',
      includeMethodology: false,
      includeTeamContextPlaceholder: false,
      enableCompetitionDiscount: true,
      enableInjuryAvailabilityAdjustment: true,
      enableQbOffenseContextAdjustment: true,
      enableSampleSizeAdjustment: true,
      enableArchetypeConfidenceAdjustment: true,
      enableCoachabilityAdjustment: true,
      enableRfaAdjustment: true,
      enableRvaAdjustment: true,
    });

    expect(result.rows).toEqual([]);
    expect(prospectRepository.searchWideReceivers).toHaveBeenCalledOnce();
    expect(evaluationRepository.findStoredWrEvaluation).toHaveBeenCalledOnce();
  });
});
