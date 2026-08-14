import type { B4MeScoringMode } from '../../domain/enums/B4MeScoringMode';
import type { WrProspectSearchFilters } from '../../domain/contracts/WrFramework.types';

const WR_EVALUATION_POLICY_VERSION = 'source-backed-research-v1';

export class WrEvaluationKeyBuilder {
  public build(prospectId: number, frameworkVersion: string, filters: WrProspectSearchFilters): string {
    const toggles = [
      filters.enableCompetitionDiscount ? 'comp1' : 'comp0',
      filters.enableInjuryAvailabilityAdjustment ? 'inj1' : 'inj0',
      filters.enableQbOffenseContextAdjustment ? 'ctx1' : 'ctx0',
      filters.enableSampleSizeAdjustment ? 'smp1' : 'smp0',
      filters.enableArchetypeConfidenceAdjustment ? 'arch1' : 'arch0',
      filters.enableCoachabilityAdjustment ? 'coach1' : 'coach0',
      filters.enableRfaAdjustment ? 'rfa1' : 'rfa0',
      filters.enableRvaAdjustment ? 'rva1' : 'rva0'
    ].join('|');

    return ['WR', String(prospectId), frameworkVersion, WR_EVALUATION_POLICY_VERSION, filters.scoringMode as B4MeScoringMode, toggles].join('::');
  }
}
