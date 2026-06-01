import type { B4MeScoringMode } from '../../../b4meAnalysis/domain/enums/B4MeScoringMode';
import type { GetOrCreateWrB4MeEvaluationUseCase } from '../../../b4meAnalysis/application/usecases/GetOrCreateWrB4MeEvaluationUseCase';

export class WrEvaluationBatchService {
  public constructor(
    private readonly wrEvaluationUseCase: GetOrCreateWrB4MeEvaluationUseCase
  ) {}

  public async recomputePlayer(
    playerName: string,
    draftYear: number | null,
    scoringModes: ReadonlyArray<B4MeScoringMode>
  ): Promise<number> {
    let createdCount = 0;

    for (const scoringMode of scoringModes) {
      const response = await this.wrEvaluationUseCase.execute({
        playerName,
        draftYear,
        scoringMode,
        includeMethodology: false,
        includeTeamContextPlaceholder: false,
        enableCompetitionDiscount: true,
        enableInjuryAvailabilityAdjustment: true,
        enableQbOffenseContextAdjustment: true,
        enableSampleSizeAdjustment: true,
        enableArchetypeConfidenceAdjustment: true,
        enableCoachabilityAdjustment: true,
        enableRfaAdjustment: true,
        enableRvaAdjustment: true
      });

      if (response.rows.length > 0) {
        createdCount += response.rows.length;
      }
    }

    return createdCount;
  }
}
