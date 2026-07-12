// src/modules/draft-analysis/domain/repositories/ILiveDraftPickRepository.ts
import { LiveDraftPick } from '../entities/LiveDraftPick.entity';

export interface ILiveDraftPickRepository {
  findById(id: string): Promise<LiveDraftPick | null>;
  
  findByDraftYear(year: number): Promise<LiveDraftPick[]>;
  
  findByTeam(teamId: string, year: number): Promise<LiveDraftPick[]>;
  
  findByRound(year: number, round: number): Promise<LiveDraftPick[]>;
  
  findCurrentPick(year: number): Promise<LiveDraftPick | null>;
  
  save(pick: LiveDraftPick): Promise<LiveDraftPick>;
  
  update(pick: LiveDraftPick): Promise<LiveDraftPick>;
  
  delete(id: string): Promise<void>;
  
  findAll(year: number): Promise<LiveDraftPick[]>;
}