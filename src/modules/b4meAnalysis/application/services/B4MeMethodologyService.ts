import type {
  B4MeActiveFilterSummary,
  B4MeFrameworkCatalogRecord,
  B4MeMethodologyMetadata,
  B4MeOptionalTeamContext,
  B4MeScoreExplanation
} from '../../domain/contracts/B4MeFrameworkContracts';
import type { B4MeEvaluateProspectsQueryDto } from '../dto/B4MeEvaluateProspectsQueryDto';
import type { WrProspectSearchFilters } from '../../domain/contracts/WrFramework.types';

function splitKnownLimitations(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(/\.|\n|;/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export class B4MeMethodologyService {
  public buildMethodology(
    framework: B4MeFrameworkCatalogRecord,
    query: B4MeEvaluateProspectsQueryDto
  ): B4MeMethodologyMetadata {
    return {
      frameworkVersion: framework.frameworkVersion,
      positionGroupFrameworkType: framework.frameworkType,
      methodologyLineage: framework.methodologyLineage,
      validationStatus: framework.validationStatus,
      validationNote: framework.validationNote,
      knownLimitations: splitKnownLimitations(framework.knownLimitations),
      scoringModeUsed: query.scoringMode,
      methodologySections: [
        {
          key: 'base-framework',
          title: 'Base Framework',
          body: 'B4Me remains the canonical player-evaluation layer and is not replaced by later decision-support overlays.'
        },
        {
          key: 'decision-overlays',
          title: 'Decision Overlays',
          body: 'Coachability, RFA, and RVA remain separate dimensions that can inform decision view without mutating the canonical base framework.'
        },
        {
          key: 'team-context',
          title: 'Future Team Context',
          body: 'Optional team context is deferred-ready, safe-null, and UI-controlled. It is displayed as non-canonical context rather than as a silent score rewrite.'
        }
      ]
    };
  }


  public buildScoreExplanation(
    playerName: string,
    baseScore: number,
    enhancedScore: number,
    decisionViewScore: number
  ): B4MeScoreExplanation {
    const roundedBase = Number(baseScore.toFixed(2));
    const roundedEnhanced = Number(enhancedScore.toFixed(2));
    const roundedDecision = Number(decisionViewScore.toFixed(2));

    return {
      title: `${playerName} score explanation`,
      summary: `${playerName} posts base ${roundedBase}, enhanced ${roundedEnhanced}, and decision-view ${roundedDecision}.`,
      lines: [
        `Base score is the canonical talent-transfer layer: ${roundedBase}.`,
        `Enhanced score adds the Phase 2–3 refinements without replacing canonical identity: ${roundedEnhanced}.`,
        `Decision-view score layers coachability, RFA, and RVA as separate decision-support dimensions: ${roundedDecision}.`
      ]
    };
  }

  public buildMethodologySnapshot(frameworkVersion: string, filters: WrProspectSearchFilters): Record<string, unknown> {
    return {
      frameworkVersion,
      positionGroup: 'WR',
      scoringMode: filters.scoringMode,
      layers: [
        'Source-backed Big 4 research indicators',
        'Mod-1 contextual behind-LOS adjuster',
        'Mod-2 PFF vs YPRR divergence',
        'Mod-3 contact archetype',
        'Optional limitation corrections',
        'Coachability',
        'RFA',
        'RVA'
      ],
      researchIndicatorPolicy: {
        metricSeasonPolicy: 'FINAL_COLLEGE_SEASON',
        hitMissRequiresSourceBackedMetric: true,
        derivedEstimatesExcludedFromHitMiss: true,
        thresholds: {
          yprr: '>= 3.00',
          pffOverallGrade: '>= 83.0',
          contestedCatchRate: '>= 50.0',
          behindLosTargetRate: '< 18.0'
        }
      },
      toggles: {
        competition: filters.enableCompetitionDiscount,
        injuryAvailability: filters.enableInjuryAvailabilityAdjustment,
        qbOffenseContext: filters.enableQbOffenseContextAdjustment,
        sampleSize: filters.enableSampleSizeAdjustment,
        archetypeConfidence: filters.enableArchetypeConfidenceAdjustment,
        coachability: filters.enableCoachabilityAdjustment,
        rfa: filters.enableRfaAdjustment,
        rva: filters.enableRvaAdjustment
      }
    };
  }

  public buildActiveFilterSummary(filters: WrProspectSearchFilters): Record<string, unknown> {
    return {
      positionGroup: 'WR',
      playerName: filters.playerName,
      draftYear: filters.draftYear,
      scoringMode: filters.scoringMode,
      badges: [
        'Position: WR',
        `Scoring: ${filters.scoringMode}`,
        filters.draftYear !== null ? `Draft Year: ${filters.draftYear}` : 'Draft Year: All',
        filters.playerName ? `Player: ${filters.playerName}` : 'Player: All',
        filters.enableCompetitionDiscount ? 'Competition: On' : 'Competition: Off',
        filters.enableInjuryAvailabilityAdjustment ? 'Injury: On' : 'Injury: Off',
        filters.enableQbOffenseContextAdjustment ? 'QB/Offense: On' : 'QB/Offense: Off',
        filters.enableSampleSizeAdjustment ? 'Sample Size: On' : 'Sample Size: Off',
        filters.enableArchetypeConfidenceAdjustment ? 'Archetype Confidence: On' : 'Archetype Confidence: Off',
        filters.enableCoachabilityAdjustment ? 'Coachability: On' : 'Coachability: Off',
        filters.enableRfaAdjustment ? 'RFA: On' : 'RFA: Off',
        filters.enableRvaAdjustment ? 'RVA: On' : 'RVA: Off'
      ]
    };
  }

  public buildOptionalTeamContext(enabled: boolean): Record<string, unknown> | null {
    if (!enabled) {
      return null;
    }

    return {
      isDeferred: true,
      isApplied: false,
      label: 'Deferred optional team context',
      teamCoachingGradeByGroup: null,
      teamDevelopmentEnvironment: null,
      teamUsageFitContext: null
    };
  }
}