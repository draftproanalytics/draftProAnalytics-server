// src/modules/draft-analysis/application/dto/AnalyzeTeamDraftPattern.dto.ts
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';
import { PositionGroupMetrics } from '../../domain/value-objects/PositionGroup.vo';

export interface AnalyzeTeamDraftPatternRequestDto {
  teamId: string;
  regimeStartYear: number;
  generalManager: string;
  headCoach: string;
}

export interface PositionMetricsDto {
  position: PositionGroup;
  totalPicks: number;
  successfulPicks: number;
  successRate: number;
  averageRound: number;
  preferredRounds: number[];
  competency: 'Elite' | 'Good' | 'Average' | 'Poor' | 'Terrible';
  systemFitBias: boolean;
}

export interface AnalyzeTeamDraftPatternResponseDto {
  teamId: string;
  regimeStartYear: number;
  regimeEndYear: number | null;
  generalManager: string;
  headCoach: string;
  positionMetrics: PositionMetricsDto[];
  bestDraftingPositions: PositionGroup[];
  worstDraftingPositions: PositionGroup[];
  overallSuccessRate: number;
  totalPicksAnalyzed: number;
}