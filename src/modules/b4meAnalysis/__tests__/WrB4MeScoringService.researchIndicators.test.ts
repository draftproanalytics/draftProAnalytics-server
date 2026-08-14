import { describe, expect, it } from 'vitest';
import { WrB4MeScoringService } from '../application/services/WrB4MeScoringService';
import type {
  WrMetricsRecord,
  WrProspectRecord,
  WrProspectSearchFilters
} from '../domain/contracts/WrFramework.types';

const prospect: WrProspectRecord = {
  id: 1,
  playerName: 'Denzel Boston',
  school: 'Washington',
  draftYear: 2026,
  position: 'WR'
};

const filters: WrProspectSearchFilters = {
  playerName: 'Denzel Boston',
  draftYear: 2026,
  scoringMode: 'BASE_ONLY',
  includeMethodology: true,
  includeTeamContextPlaceholder: false,
  enableCompetitionDiscount: false,
  enableInjuryAvailabilityAdjustment: false,
  enableQbOffenseContextAdjustment: false,
  enableSampleSizeAdjustment: false,
  enableArchetypeConfidenceAdjustment: false,
  enableCoachabilityAdjustment: false,
  enableRfaAdjustment: false,
  enableRvaAdjustment: false
};

function buildMetrics(overrides: Partial<WrMetricsRecord> = {}): WrMetricsRecord {
  return {
    prospectId: 1,
    yprr: 2.44,
    pffOverallGrade: 88,
    contestedCatchRate: 76.9,
    behindLosTargetRate: 10.5,
    receptions: 63,
    targets: 101,
    missedTacklesForcedPerReception: 0.14,
    yacAfterContactPerReception: 2.1,
    routesRun: 412,
    gamesPlayed: 13,
    gamesMissed: 0,
    competitionLevel: 'POWER',
    offensiveContextNotes: null,
    qbPlayQuality: 0.61,
    pffRank: null,
    yprrRank: null,
    pressManWinRate: 0.56,
    releasePackageDepth: 3,
    routeFamilyDiversity: 7,
    alignmentFlexibilityIndex: 6,
    rolePortabilityIndex: 7,
    usageAdaptabilityIndex: 6,
    slotRate: 18,
    wideRate: 82,
    boundaryRate: 71,
    sourceMetadataJson: {
      provider: 'HYBRID_PUBLIC',
      playerSearchName: 'Denzel Boston',
      resolvedPlayerName: 'Denzel Boston',
      draftYear: 2026,
      sourcesUsed: ['Published research source'],
      observedFields: ['yprr', 'pffOverallGrade', 'contestedCatchRate', 'behindLosTargetRate'],
      derivedFields: [],
      metricSeasonYear: 2025,
      seasonSelectionPolicy: 'FINAL_COLLEGE_SEASON',
      injuryMissedGamesIsConfirmedOnly: true,
      notes: []
    },
    ...overrides
  };
}

describe('WrB4MeScoringService research indicators', () => {
  it('applies source-backed thresholds deterministically', () => {
    const result = new WrB4MeScoringService().compute(prospect, buildMetrics(), filters);

    expect(result.base.rawBoxCount).toBe(3);
    expect(result.base.availableMetricCount).toBe(4);
    expect(result.base.derivedMetricCount).toBe(0);
    expect(result.base.metricResults.map((item) => item.status)).toEqual([
      'MISS',
      'HIT',
      'HIT',
      'HIT'
    ]);
  });

  it('does not convert derived estimates into research HIT/MISS results', () => {
    const metrics = buildMetrics({
      sourceMetadataJson: {
        ...buildMetrics().sourceMetadataJson!,
        observedFields: [],
        derivedFields: ['yprr', 'pffOverallGrade', 'contestedCatchRate', 'behindLosTargetRate']
      }
    });

    const result = new WrB4MeScoringService().compute(prospect, metrics, filters);

    expect(result.base.rawBoxCount).toBe(0);
    expect(result.base.availableMetricCount).toBe(0);
    expect(result.base.derivedMetricCount).toBe(4);
    expect(result.base.metricResults.every((item) => item.status === 'DERIVED_ESTIMATE')).toBe(true);
    expect(result.base.metricResults.every((item) => item.passed === null)).toBe(true);
  });
});
