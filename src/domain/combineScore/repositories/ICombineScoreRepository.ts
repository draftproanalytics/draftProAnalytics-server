import { CombineScore } from '../entities/CombineScore';
import { PaginationParams, PaginatedResponse } from '@/shared/types/common';

export interface CombineScoreFilters {
  playerId?: number;
  prospectId?: number;
  fortyTimeMin?: number;
  fortyTimeMax?: number;
  verticalLeapMin?: number;
  verticalLeapMax?: number;
  broadJumpMin?: number;
  broadJumpMax?: number;
  hasCompleteWorkout?: boolean;
}

export interface CombineScoreWorkspaceFilters {
  draftYear?: number;
  position?: string;
  college?: string;
  playerName?: string;
  combineStatus?: 'MISSING' | 'PARTIAL' | 'COMPLETE';
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CombineScoreProspectSummary {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
  college: string;
  draftYear?: number;
  draftStatus?: string;
}

export interface CombineScoreWorkspaceRow {
  prospect: CombineScoreProspectSummary;
  score?: CombineScore;
}

export interface CombineMeasurementAverages {
  height?: number;
  weight?: number;
  fortyTime?: number;
  verticalLeap?: number;
  benchPress?: number;
}

export interface ICombineScoreRepository {
  save(combineScore: CombineScore): Promise<CombineScore>;
  findById(id: number): Promise<CombineScore | null>;
  findAll(filters?: CombineScoreFilters, pagination?: PaginationParams): Promise<PaginatedResponse<CombineScore>>;
  findWorkspace(filters?: CombineScoreWorkspaceFilters, pagination?: PaginationParams): Promise<PaginatedResponse<CombineScoreWorkspaceRow>>;
  update(id: number, combineScore: CombineScore): Promise<CombineScore>;
  delete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
  findByPlayerId(playerId: number): Promise<CombineScore | null>;
  findByPlayerIds(playerIds: number[]): Promise<CombineScore[]>;
  findByProspectId(prospectId: number): Promise<CombineScore | null>;
  findByProspectIds(prospectIds: number[]): Promise<CombineScore[]>;
  findTopPerformers(metric: string, limit?: number): Promise<CombineScore[]>;
  findByAthleticScoreRange(minScore: number, maxScore: number): Promise<CombineScore[]>;
  getMeasurementAverages(): Promise<CombineMeasurementAverages>;
}
