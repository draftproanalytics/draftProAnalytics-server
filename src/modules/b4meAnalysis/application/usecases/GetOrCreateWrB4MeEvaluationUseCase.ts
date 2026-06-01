import { PrismaB4MeFrameworkRepository } from '../../infrastructure/repositories/PrismaB4MeFrameworkRepository';
import type { IProspectLookupRepository } from '../../domain/repositories/IProspectLookupRepository';
import type { IB4MeWrMetricsRepository } from '../../domain/repositories/IB4MeWrMetricsRepository';
import type {
  IB4MeEvaluationOrchestratorRepository,
  StoredB4MeEvaluationRecord,
} from '../../domain/repositories/IB4MeEvaluationOrchestratorRepository';
import type { WrProspectSearchFilters } from '../../domain/contracts/WrFramework.types';
import { B4MeMethodologyService } from '../services/B4MeMethodologyService';
import { WrB4MeScoringService } from '../services/WrB4MeScoringService';
import { WrEvaluationKeyBuilder } from '../services/WrEvaluationKeyBuilder';
import type { B4MeScoringMode } from '../../domain/enums/B4MeScoringMode';
import { LiveWrProspectIntakeService } from '../services/LiveWrProspectIntakeService';
import { logger } from '../../../../utils/Logger';

export interface B4MeListRowDto {
  readonly prospectId: number;
  readonly playerName: string;
  readonly school: string | null;
  readonly positionGroup: 'WR';
  readonly draftYear: number | null;
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
  readonly row: StoredB4MeEvaluationRecord | null;
  readonly methodology: Record<string, unknown> | null;
  readonly activeFilterSummary: Record<string, unknown>;
  readonly optionalTeamContext: Record<string, unknown> | null;
}

export class GetOrCreateWrB4MeEvaluationUseCase {
  public constructor(
    private readonly frameworkRepository: PrismaB4MeFrameworkRepository,
    private readonly prospectRepository: IProspectLookupRepository,
    private readonly metricsRepository: IB4MeWrMetricsRepository,
    private readonly evaluationRepository: IB4MeEvaluationOrchestratorRepository,
    private readonly methodologyService: B4MeMethodologyService,
    private readonly scoringService: WrB4MeScoringService,
    private readonly evaluationKeyBuilder: WrEvaluationKeyBuilder,
    private readonly liveWrProspectIntakeService: LiveWrProspectIntakeService
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

    let prospects = await this.prospectRepository.searchWideReceivers(
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
    // Fallback only when no local prospects exist
    if (prospects.length === 0 && filters.playerName !== null) {
      await this.liveWrProspectIntakeService.getOrCreateFromLiveSource(
        filters.playerName,
        filters.draftYear
      );

      prospects = await this.prospectRepository.searchWideReceivers(
        filters.playerName,
        filters.draftYear
      );
    }

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
        continue;
      }

      let metrics = await this.metricsRepository.findByProspectId(prospect.id);
      logger.debug('[B4Me execute] metrics found before hydrate', {
        prospectId: prospect.id,
        hasMetrics: metrics !== null,
      });

      // NEW: if prospect exists but metrics do not, try live hydration
      if (metrics === null && prospect.playerName.trim().length > 0) {
        await this.liveWrProspectIntakeService.getOrCreateFromLiveSource(
          prospect.playerName,
          prospect.draftYear
        );

        metrics = await this.metricsRepository.findByProspectId(prospect.id);
        logger.debug('[B4Me execute] metrics found after hydrate', {
          prospectId: prospect.id,
          hasMetrics: metrics !== null,
        });
      }

      if (metrics === null) {
        continue;
      }

      const computed = this.scoringService.compute(prospect, metrics, filters);

      const created: StoredB4MeEvaluationRecord =
        await this.evaluationRepository.createStoredWrEvaluation({
          prospectId: prospect.id,
          playerName: prospect.playerName,
          school: prospect.school,
          draftYear: prospect.draftYear,
          frameworkCatalogId: framework.id,
          frameworkVersion: framework.frameworkVersion,
          scoringMode: filters.scoringMode,
          evaluationKey,
          methodologySnapshotJson: methodology,
          activeFilterSummaryJson: activeFilterSummary,
          optionalTeamContextJson: optionalTeamContext,
          computed,
        });
      logger.debug('[B4Me execute] creating evaluation', {
        prospectId: prospect.id,
        playerName: prospect.playerName,
        evaluationKey,
      });
      rows.push(this.mapStoredEvaluationToListRow(created));
      logger.debug('[B4Me execute] row pushed', {
        prospectId: created.prospectId,
        playerName: created.playerName,
      });
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

    let stored: StoredB4MeEvaluationRecord | null =
      await this.evaluationRepository.findStoredWrEvaluation(evaluationKey);

    if (stored === null) {
      let metrics = await this.metricsRepository.findByProspectId(prospect.id);

      if (metrics === null && prospect.playerName.trim().length > 0) {
        await this.liveWrProspectIntakeService.getOrCreateFromLiveSource(
          prospect.playerName,
          prospect.draftYear
        );

        metrics = await this.metricsRepository.findByProspectId(prospect.id);
      }

      if (metrics === null) {
        return {
          row: null,
          methodology,
          activeFilterSummary,
          optionalTeamContext,
        };
      }

      const computed = this.scoringService.compute(prospect, metrics, evaluationFilters);

      stored = await this.evaluationRepository.createStoredWrEvaluation({
        prospectId: prospect.id,
        playerName: prospect.playerName,
        school: prospect.school,
        draftYear: prospect.draftYear,
        frameworkCatalogId: framework.id,
        frameworkVersion: framework.frameworkVersion,
        scoringMode: evaluationFilters.scoringMode,
        evaluationKey,
        methodologySnapshotJson: methodology,
        activeFilterSummaryJson: activeFilterSummary,
        optionalTeamContextJson: optionalTeamContext,
        computed,
      });
    }

    return {
      row: stored,
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

    return {
      prospectId: stored.prospectId ?? 0,
      playerName: stored.playerName,
      school: stored.school,
      positionGroup: 'WR',
      draftYear: stored.draftYear,
      baseScore,
      enhancedScore: finalScore,
      decisionViewScore: finalScore,
      scoreLabel: this.getScoreLabel(finalScore),
      scoreExplanation: stored.scoreExplanation ?? 'Stored evaluation reused.',
      evaluationNotes: stored.scoreExplanation,
      decisionViewDimensions: {
        coachability,
        rfa,
        rva,
      },
    };
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
