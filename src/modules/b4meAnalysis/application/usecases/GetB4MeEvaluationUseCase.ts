import type { B4MeScoringMode } from '../../domain/enums/B4MeScoringMode';
import type { WrProspectSearchFilters } from '../../domain/contracts/WrFramework.types';
import type {
  StoredB4MeEvaluationRecord
} from '../../domain/repositories/IB4MeEvaluationOrchestratorRepository';
import {
  GetOrCreateWrB4MeEvaluationUseCase,
  type B4MeSearchResponseDto
} from './GetOrCreateWrB4MeEvaluationUseCase';

export interface B4MeEvaluateProspectsQueryDto {
  readonly positionGroup: 'WR';
  readonly playerName: string | null;
  readonly draftYear: number | null;
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

export interface B4MeEvaluateProspectByIdQueryDto {
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

function toWrFilters(query: B4MeEvaluateProspectsQueryDto): WrProspectSearchFilters {
  return {
    playerName: query.playerName,
    draftYear: query.draftYear,
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
    enableRvaAdjustment: query.enableRvaAdjustment
  };
}

export class GetB4MeEvaluationUseCase {
  public constructor(
    private readonly wrUseCase: GetOrCreateWrB4MeEvaluationUseCase
  ) {}

  public async execute(query: B4MeEvaluateProspectsQueryDto): Promise<B4MeSearchResponseDto> {
    if (query.positionGroup !== 'WR') {
      return {
        rows: [],
        methodology: query.includeMethodology
          ? { message: 'Non-WR real orchestration is deferred.' }
          : null,
        activeFilterSummary: {
          positionGroup: query.positionGroup,
          deferred: true
        },
        optionalTeamContext: query.includeTeamContextPlaceholder
          ? {
              isDeferred: true,
              isApplied: false
            }
          : null
      };
    }

    return this.wrUseCase.execute(toWrFilters(query));
  }

  public async executeByProspectId(
    query: B4MeEvaluateProspectByIdQueryDto
  ): Promise<B4MeDetailResponseDto> {
    if (query.positionGroup !== 'WR') {
      return {
        row: null,
        methodology: query.includeMethodology
          ? { message: 'Non-WR real orchestration is deferred.' }
          : null,
        activeFilterSummary: {
          positionGroup: query.positionGroup,
          deferred: true
        },
        optionalTeamContext: query.includeTeamContextPlaceholder
          ? {
              isDeferred: true,
              isApplied: false
            }
          : null
      };
    }

    return this.wrUseCase.executeByProspectId({
      positionGroup: 'WR',
      prospectId: query.prospectId,
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
      enableRvaAdjustment: query.enableRvaAdjustment
    });
  }
}