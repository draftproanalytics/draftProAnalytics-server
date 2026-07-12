// src/modules/draft-analysis/application/dto/GradeDraftPick.dto.ts
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export interface GradeDraftPickRequestDto {
  teamId: string;
  round: number;
  pick: number;
  position: PositionGroup;
  playerName: string;
  consensusRanking: number;
  college?: string;
}

export interface DraftGradeDto {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  reasoning: string[];
}

export interface GradeDraftPickResponseDto {
  teamId: string;
  playerName: string;
  position: PositionGroup;
  round: number;
  pick: number;
  grade: DraftGradeDto;
  expectedSuccess: number;
  historicalContext: string;
  valueAnalysis: string;
  warnings: string[];
  isReach: boolean;
  isValue: boolean;
}