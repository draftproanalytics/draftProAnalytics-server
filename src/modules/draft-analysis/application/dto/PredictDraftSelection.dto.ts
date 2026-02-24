// src/modules/draft-analysis/application/dto/PredictDraftSelection.dto.ts
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export interface PredictDraftSelectionRequestDto {
  teamId: string;
  round: number;
  pick: number;
  year: number;
}

export interface PositionPredictionDto {
  position: PositionGroup;
  probability: number;
  reasoning: string;
  historicalSuccessRate: number;
}

export interface PredictDraftSelectionResponseDto {
  teamId: string;
  round: number;
  pick: number;
  year: number;
  predictions: PositionPredictionDto[];
  mostLikelyPosition: PositionGroup;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  teamNeedScore: number;
  historicalTendencyScore: number;
  isBestPlayerAvailableTeam: boolean;
}