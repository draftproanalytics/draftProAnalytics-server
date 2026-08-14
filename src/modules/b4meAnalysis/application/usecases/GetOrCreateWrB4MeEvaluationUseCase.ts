import { PrismaB4MeFrameworkRepository } from '../../infrastructure/repositories/PrismaB4MeFrameworkRepository';
import type { IProspectLookupRepository } from '../../domain/repositories/IProspectLookupRepository';
import type {
  IB4MeEvaluationOrchestratorRepository,
  StoredB4MeEvaluationRecord,
} from '../../domain/repositories/IB4MeEvaluationOrchestratorRepository';
import type { WrProspectSearchFilters } from '../../domain/contracts/WrFramework.types';
import { B4MeMethodologyService } from '../services/B4MeMethodologyService';
import { WrEvaluationKeyBuilder } from '../services/WrEvaluationKeyBuilder';
import type { B4MeScoringMode } from '../../domain/enums/B4MeScoringMode';
import { logger } from '../../../../utils/Logger';

export interface B4MeMetricDisplayDto {
  readonly key: string;
  readonly label: string;
  readonly value: number | string | null;
  readonly unit: string | null;
}

export interface B4MeListRowDto {
  readonly prospectId: number;
  readonly playerName: string;
  readonly school: string | null;
  readonly positionGroup: 'WR';
  readonly draftYear: number | null;

  /** Legacy summary fields retained for consumers outside the B4Me detail panel. */
  readonly baseScore: number;
  readonly enhancedScore: number;
  readonly decisionViewScore: number;
  readonly scoreLabel: string;
  readonly scoreExplanation: string;
  readonly evaluationNotes: string | null;
  readonly decisionViewDimensions: {
    readonly coachability: number;
    readonly rfa: number;
    readonly rva: number;
  };

  readonly observedMetrics: {
    readonly sourceProvider: string | null;
    readonly sourcesUsed: readonly string[];
    readonly metricSeasonYear: number | null;
    readonly seasonSelectionPolicy: string | null;
    readonly items: readonly B4MeMetricDisplayDto[];
    readonly manualObservation: {
      readonly sourceName: string;
      readonly sourceUrl: string | null;
      readonly notes: string | null;
      readonly enteredByPersonId: number;
      readonly enteredAt: string;
      readonly fields: readonly string[];
    } | null;
  };
  readonly researchIndicators: {
    readonly methodologyVersion: string;
    readonly sourceProvider: string | null;
    readonly sourcesUsed: readonly string[];
    readonly thresholdsMet: number;
    readonly sourceBackedMetricCount: number;
    readonly derivedMetricCount: number;
    readonly metricSeasonYear: number | null;
    readonly seasonSelectionPolicy: string | null;
    readonly items: readonly {
      readonly key: string;
      readonly label: string;
      readonly value: number | null;
      readonly threshold: number;
      readonly comparison: string;
      readonly status: string;
    }[];
  };
  readonly derivedMetrics: {
    readonly items: readonly B4MeMetricDisplayDto[];
    readonly note: string;
  };
  readonly evaluativeJudgment: {
    readonly coachability: {
      readonly tier: string | null;
      readonly adjustment: number;
      readonly pressManSurvivability: string | null;
      readonly summary: string | null;
    };
    readonly rfa: {
      readonly tier: string | null;
      readonly adjustment: number;
      readonly summary: string | null;
    };
    readonly rva: {
      readonly tier: string | null;
      readonly score: number | null;
    };
    readonly finalB4MeAssessment: {
      readonly score: number;
      readonly label: string;
      readonly explanation: string;
      readonly projectionNote: string | null;
    };
  };
}

export interface B4MeSearchResponseDto {
  readonly rows: readonly B4MeListRowDto[];
  readonly methodology: Record<string, unknown> | null;
  readonly activeFilterSummary: Record<string, unknown>;
  readonly optionalTeamContext: Record<string, unknown> | null;
}

export interface WrEvaluationByProspectIdQuery {
  readonly positionGroup: 'WR';
  readonly prospectId: number;
  readonly scoringMode: B4MeScoringMode;
  readonly includeMethodology: boolean;
  readonly includeTeamContextPlaceholder: boolean;
  readonly enableCompetitionDiscount: boolean;
  readonly enableInjuryAvailabilityAdjustment: boolean;
  readonly enableQbOffenseContextAdjustment: boolean;
  readonly enableSampleSizeAdjustment: boolean;
  readonly enableArchetypeConfidenceAdjustment: boolean;
  readonly enableCoachabilityAdjustment: boolean;
  readonly enableRfaAdjustment: boolean;
  readonly enableRvaAdjustment: boolean;
}

export interface B4MeDetailResponseDto {
  readonly row: B4MeListRowDto | null;
  readonly methodology: Record<string, unknown> | null;
  readonly activeFilterSummary: Record<string, unknown>;
  readonly optionalTeamContext: Record<string, unknown> | null;
}

export class GetOrCreateWrB4MeEvaluationUseCase {
  public constructor(
    private readonly frameworkRepository: PrismaB4MeFrameworkRepository,
    private readonly prospectRepository: IProspectLookupRepository,
    private readonly evaluationRepository: IB4MeEvaluationOrchestratorRepository,
    private readonly methodologyService: B4MeMethodologyService,
    private readonly evaluationKeyBuilder: WrEvaluationKeyBuilder
  ) {}

  public async execute(filters: WrProspectSearchFilters): Promise<B4MeSearchResponseDto> {
    const framework = await this.frameworkRepository.findActiveWrFramework();

    if (!framework) {
      throw new Error('No active WR framework is configured.');
    }

    const methodology: Record<string, unknown> | null = filters.includeMethodology
      ? this.methodologyService.buildMethodologySnapshot(framework.frameworkVersion, filters)
      : null;

    const activeFilterSummary: Record<string, unknown> =
      this.methodologyService.buildActiveFilterSummary(filters);

    const optionalTeamContext: Record<string, unknown> | null =
      this.methodologyService.buildOptionalTeamContext(filters.includeTeamContextPlaceholder);

    const prospects = await this.prospectRepository.searchWideReceivers(
      filters.playerName,
      filters.draftYear
    );
    logger.debug('*********************************');
    logger.debug('[B4Me execute] search filters', filters);

    logger.debug(
      '[B4Me execute] prospects found',
      prospects.map((p) => ({
        id: p.id,
        playerName: p.playerName,
        draftYear: p.draftYear,
      }))
    );
    logger.debug('*********************************');
    const rows: B4MeListRowDto[] = [];

    for (const prospect of prospects) {
      const evaluationKey: string = this.evaluationKeyBuilder.build(
        prospect.id,
        framework.frameworkVersion,
        filters
      );

      const stored: StoredB4MeEvaluationRecord | null =
        await this.evaluationRepository.findStoredWrEvaluation(evaluationKey);

      if (stored !== null) {
        rows.push(this.mapStoredEvaluationToListRow(stored));
      }
    }

    return {
      rows,
      methodology,
      activeFilterSummary,
      optionalTeamContext,
    };
  }

  public async executeByProspectId(
    query: WrEvaluationByProspectIdQuery
  ): Promise<B4MeDetailResponseDto> {
    const framework = await this.frameworkRepository.findActiveWrFramework();
    if (!framework) {
      throw new Error('No active WR framework is configured.');
    }

    const baseFilters: WrProspectSearchFilters = {
      playerName: null,
      draftYear: null,
      scoringMode: query.scoringMode,
      includeMethodology: query.includeMethodology,
      includeTeamContextPlaceholder: query.includeTeamContextPlaceholder,
      enableCompetitionDiscount: query.enableCompetitionDiscount,
      enableInjuryAvailabilityAdjustment: query.enableInjuryAvailabilityAdjustment,
      enableQbOffenseContextAdjustment: query.enableQbOffenseContextAdjustment,
      enableSampleSizeAdjustment: query.enableSampleSizeAdjustment,
      enableArchetypeConfidenceAdjustment: query.enableArchetypeConfidenceAdjustment,
      enableCoachabilityAdjustment: query.enableCoachabilityAdjustment,
      enableRfaAdjustment: query.enableRfaAdjustment,
      enableRvaAdjustment: query.enableRvaAdjustment,
    };

    const methodology: Record<string, unknown> | null = query.includeMethodology
      ? this.methodologyService.buildMethodologySnapshot(framework.frameworkVersion, baseFilters)
      : null;

    const activeFilterSummary: Record<string, unknown> =
      this.methodologyService.buildActiveFilterSummary(baseFilters);

    const optionalTeamContext: Record<string, unknown> | null =
      this.methodologyService.buildOptionalTeamContext(query.includeTeamContextPlaceholder);

    const prospects = await this.prospectRepository.searchWideReceivers(null, null);
    const prospect = prospects.find((item) => item.id === query.prospectId);

    if (prospect === undefined) {
      return {
        row: null,
        methodology,
        activeFilterSummary,
        optionalTeamContext,
      };
    }

    const evaluationFilters: WrProspectSearchFilters = {
      ...baseFilters,
      draftYear: prospect.draftYear,
    };

    const evaluationKey: string = this.evaluationKeyBuilder.build(
      prospect.id,
      framework.frameworkVersion,
      evaluationFilters
    );

    const stored: StoredB4MeEvaluationRecord | null =
      await this.evaluationRepository.findStoredWrEvaluation(evaluationKey);

    if (stored === null) {
      return {
        row: null,
        methodology,
        activeFilterSummary,
        optionalTeamContext,
      };
    }

    return {
      row: this.mapStoredEvaluationToListRow(stored),
      methodology,
      activeFilterSummary,
      optionalTeamContext,
    };
  }

  private mapStoredEvaluationToListRow(stored: StoredB4MeEvaluationRecord): B4MeListRowDto {
    const baseScoreRaw: unknown = stored.baseScoringJson.baseScore;
    const coachabilityRaw: unknown = stored.coachabilityJson.adjustment;
    const rfaRaw: unknown = stored.rfaJson.adjustment;

    const baseScore: number = typeof baseScoreRaw === 'number' ? baseScoreRaw : 0;
    const coachability: number = typeof coachabilityRaw === 'number' ? coachabilityRaw : 0;
    const rfa: number = typeof rfaRaw === 'number' ? rfaRaw : 0;
    const rva: number = stored.rvaPlaceholderScore ?? 0;
    const finalScore: number = stored.finalB4MeScore ?? 0;
    const scoreLabel = this.getScoreLabel(finalScore);

    const metricResultsRaw: unknown = stored.baseScoringJson.metricResults;
    const metricResults = Array.isArray(metricResultsRaw)
      ? metricResultsRaw.flatMap((item) => {
          if (item === null || Array.isArray(item) || typeof item !== 'object') {
            return [];
          }
          const record = item as Record<string, unknown>;
          const value = typeof record.value === 'number' ? record.value : null;
          const threshold = typeof record.threshold === 'number' ? record.threshold : 0;
          return [{
            key: typeof record.key === 'string' ? record.key : '',
            label: typeof record.label === 'string' ? record.label : '',
            value,
            threshold,
            comparison: typeof record.comparison === 'string' ? record.comparison : '>=',
            status: typeof record.status === 'string' ? record.status : 'UNVERIFIED'
          }];
        })
      : [];

    const availableMetricCountRaw: unknown = stored.baseScoringJson.availableMetricCount;
    const derivedMetricCountRaw: unknown = stored.baseScoringJson.derivedMetricCount;
    const rawMetricsSourceMetadata: unknown = stored.rawMetricsJson.sourceMetadataJson;
    const sourceMetadata = rawMetricsSourceMetadata !== null && !Array.isArray(rawMetricsSourceMetadata) && typeof rawMetricsSourceMetadata === 'object'
      ? rawMetricsSourceMetadata as Record<string, unknown>
      : {};

    const observedFields = this.readStringArray(sourceMetadata.observedFields);
    const derivedFields = this.readStringArray(sourceMetadata.derivedFields);
    const sourcesUsed = this.readStringArray(sourceMetadata.sourcesUsed);
    const sourceProvider = typeof sourceMetadata.provider === 'string' ? sourceMetadata.provider : null;
    const metricSeasonYear = typeof sourceMetadata.metricSeasonYear === 'number'
      ? sourceMetadata.metricSeasonYear
      : null;
    const seasonSelectionPolicy = typeof sourceMetadata.seasonSelectionPolicy === 'string'
      ? sourceMetadata.seasonSelectionPolicy
      : null;
    const manualRaw = sourceMetadata.manualObservation;
    const manualRecord = manualRaw !== null && !Array.isArray(manualRaw) && typeof manualRaw === 'object'
      ? manualRaw as Record<string, unknown>
      : null;
    const manualObservation = manualRecord !== null && manualRecord.sourceType === 'MANUAL' &&
      typeof manualRecord.sourceName === 'string' && typeof manualRecord.enteredByPersonId === 'number' &&
      typeof manualRecord.enteredAt === 'string'
      ? {
          sourceName: manualRecord.sourceName,
          sourceUrl: typeof manualRecord.sourceUrl === 'string' ? manualRecord.sourceUrl : null,
          notes: typeof manualRecord.notes === 'string' ? manualRecord.notes : null,
          enteredByPersonId: manualRecord.enteredByPersonId,
          enteredAt: manualRecord.enteredAt,
          fields: this.readStringArray(manualRecord.fields),
        }
      : null;

    return {
      prospectId: stored.prospectId ?? 0,
      playerName: stored.playerName,
      school: stored.school,
      positionGroup: 'WR',
      draftYear: stored.draftYear,
      baseScore,
      enhancedScore: finalScore,
      decisionViewScore: finalScore,
      scoreLabel,
      scoreExplanation: stored.scoreExplanation ?? 'Stored evaluation reused.',
      evaluationNotes: stored.scoreExplanation,
      decisionViewDimensions: {
        coachability,
        rfa,
        rva,
      },
      observedMetrics: {
        sourceProvider,
        sourcesUsed,
        metricSeasonYear,
        seasonSelectionPolicy,
        items: this.buildMetricDisplayItems(stored.rawMetricsJson, observedFields),
        manualObservation,
      },
      researchIndicators: {
        methodologyVersion: stored.frameworkVersion,
        sourceProvider,
        sourcesUsed,
        thresholdsMet: baseScore,
        sourceBackedMetricCount:
          typeof availableMetricCountRaw === 'number' ? availableMetricCountRaw : 0,
        derivedMetricCount:
          typeof derivedMetricCountRaw === 'number' ? derivedMetricCountRaw : 0,
        metricSeasonYear,
        seasonSelectionPolicy,
        items: metricResults,
      },
      derivedMetrics: {
        items: this.buildMetricDisplayItems(stored.rawMetricsJson, derivedFields),
        note: 'Derived metrics are deterministic or heuristic transformations of other inputs. They are not presented as directly observed facts.',
      },
      evaluativeJudgment: {
        coachability: {
          tier: stored.coachabilityTier,
          adjustment: coachability,
          pressManSurvivability: stored.pressManSurvivability,
          summary: typeof stored.coachabilityJson.summary === 'string'
            ? stored.coachabilityJson.summary
            : null,
        },
        rfa: {
          tier: stored.rfaTier,
          adjustment: rfa,
          summary: typeof stored.rfaJson.summary === 'string' ? stored.rfaJson.summary : null,
        },
        rva: {
          tier: stored.rvaTier,
          score: stored.rvaPlaceholderScore,
        },
        finalB4MeAssessment: {
          score: finalScore,
          label: scoreLabel,
          explanation: stored.scoreExplanation ?? 'Stored evaluation reused.',
          projectionNote: stored.projectionNote,
        },
      },
    };
  }

  private readStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private buildMetricDisplayItems(
    rawMetrics: Record<string, unknown>,
    fields: readonly string[]
  ): B4MeMetricDisplayDto[] {
    const metricDefinitions: Record<string, { readonly label: string; readonly unit: string | null }> = {
      yprr: { label: 'Yards Per Route Run', unit: null },
      pffOverallGrade: { label: 'PFF Overall Grade', unit: null },
      contestedCatchRate: { label: 'Contested Catch Rate', unit: '%' },
      behindLosTargetRate: { label: 'Behind-LOS Target Rate', unit: '%' },
      receptions: { label: 'Receptions', unit: null },
      targets: { label: 'Targets', unit: null },
      missedTacklesForcedPerReception: { label: 'Missed Tackles Forced / Reception', unit: null },
      yacAfterContactPerReception: { label: 'YAC After Contact / Reception', unit: 'yds' },
      routesRun: { label: 'Routes Run', unit: null },
      gamesPlayed: { label: 'Games Played', unit: null },
      gamesMissed: { label: 'Games Missed', unit: null },
      qbPlayQuality: { label: 'QB Play Quality', unit: null },
      pffRank: { label: 'PFF Rank', unit: null },
      yprrRank: { label: 'YPRR Rank', unit: null },
      pressManWinRate: { label: 'Press-Man Win Rate', unit: '%' },
      releasePackageDepth: { label: 'Release Package Depth', unit: null },
      routeFamilyDiversity: { label: 'Route Family Diversity', unit: null },
      alignmentFlexibilityIndex: { label: 'Alignment Flexibility', unit: null },
      rolePortabilityIndex: { label: 'Role Portability', unit: null },
      usageAdaptabilityIndex: { label: 'Usage Adaptability', unit: null },
      slotRate: { label: 'Slot Rate', unit: '%' },
      wideRate: { label: 'Wide Rate', unit: '%' },
      boundaryRate: { label: 'Boundary Rate', unit: '%' },
    };

    return fields.flatMap((field) => {
      const definition = metricDefinitions[field];
      if (definition === undefined) {
        return [];
      }
      const rawValue = rawMetrics[field];
      const value = typeof rawValue === 'number' || typeof rawValue === 'string'
        ? rawValue
        : null;
      return [{
        key: field,
        label: definition.label,
        value,
        unit: definition.unit,
      }];
    });
  }

  private getScoreLabel(score: number): string {
    if (score >= 4.5) {
      return 'Elite';
    }
    if (score >= 3.6) {
      return 'Strong';
    }
    if (score >= 2.7) {
      return 'Viable';
    }
    return 'Developmental';
  }
}
