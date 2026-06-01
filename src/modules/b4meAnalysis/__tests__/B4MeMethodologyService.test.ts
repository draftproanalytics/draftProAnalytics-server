import { describe, expect, it } from 'vitest';
import { B4MeMethodologyService } from '../application/services/B4MeMethodologyService';

describe('B4MeMethodologyService', () => {
  it('builds filter badges and methodology metadata', () => {
    const service = new B4MeMethodologyService();

    const methodology = service.buildMethodology(
      {
        id: BigInt(1),
        positionGroup: 'WR',
        frameworkVersion: '4.0.0',
        frameworkType: 'ENHANCED_B4ME',
        methodologyLineage: 'B4Me -> Coachability -> RFA -> RVA',
        validationStatus: 'PARTIALLY_VALIDATED',
        validationNote: 'Validation note',
        knownLimitations: 'Limitation one. Limitation two.',
        scoringModeDefault: 'ENHANCED',
        isActive: true
      },
      {
        positionGroup: 'WR',
        draftYear: 2026,
        playerName: 'Alpha',
        scoringMode: 'DECISION_VIEW',
        limitationFiltersEnabled: true,
        decisionViewEnabled: true,
        includeMethodology: true,
        includeTeamContextPlaceholder: true
      }
    );

    expect(methodology.frameworkVersion).toBe('4.0.0');
    expect(methodology.knownLimitations).toHaveLength(2);

    const filters = service.buildActiveFilterSummary({
      draftYear: 2026,
      playerName: 'Boston',
      scoringMode: 'FULL_DECISION_SCORE',
      includeMethodology: true,
      includeTeamContextPlaceholder: true,
      enableCompetitionDiscount: true,
      enableInjuryAvailabilityAdjustment: true,
      enableQbOffenseContextAdjustment: true,
      enableSampleSizeAdjustment: true,
      enableArchetypeConfidenceAdjustment: true,
      enableCoachabilityAdjustment: true,
      enableRfaAdjustment: true,
      enableRvaAdjustment: true
    });

    expect(filters.badges).toContain('Position: WR');
    expect(filters.badges).toContain('Scoring: DECISION_VIEW');
    expect(filters.badges).toContain('Draft Year: 2026');
    expect(filters.badges).toContain('Player: Alpha');
  });

  it('builds safe deferred team-context placeholder', () => {
    const service = new B4MeMethodologyService();
    const result = service.buildOptionalTeamContext(true);

    expect(result).not.toBeNull();
    expect(result?.isDeferred).toBe(true);
    expect(result?.isApplied).toBe(false);
  });
});
