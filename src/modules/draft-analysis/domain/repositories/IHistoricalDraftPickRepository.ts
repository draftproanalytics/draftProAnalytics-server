// src/modules/draft-analysis/domain/repositories/IHistoricalDraftPickRepository.ts
import { HistoricalDraftPick } from '../entities/HistoricalDraftPick.entity';
import { PositionGroup } from '../value-objects/PositionGroup.vo';

export interface IHistoricalDraftPickRepository {
  findById(id: string): Promise<HistoricalDraftPick | null>;
  
  findByTeamAndYearRange(
    teamId: string,
    startYear: number,
    endYear: number
  ): Promise<HistoricalDraftPick[]>;
  
  findByTeamAndPosition(
    teamId: string,
    position: PositionGroup,
    startYear?: number
  ): Promise<HistoricalDraftPick[]>;
  
  findByTeamAndRound(
    teamId: string,
    round: number,
    startYear?: number
  ): Promise<HistoricalDraftPick[]>;
  
  save(pick: HistoricalDraftPick): Promise<HistoricalDraftPick>;
  
  saveMany(picks: HistoricalDraftPick[]): Promise<HistoricalDraftPick[]>;
  
  update(pick: HistoricalDraftPick): Promise<HistoricalDraftPick>;
  
  delete(id: string): Promise<void>;
  
  findAll(): Promise<HistoricalDraftPick[]>;
}