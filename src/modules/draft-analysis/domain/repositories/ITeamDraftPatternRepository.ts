// src/modules/draft-analysis/domain/repositories/ITeamDraftPatternRepository.ts
import { TeamDraftPattern } from '../entities/TeamDraftPattern.entity';

export interface ITeamDraftPatternRepository {
  findByTeamId(teamId: string): Promise<TeamDraftPattern | null>;
  
  findByGeneralManager(generalManager: string): Promise<TeamDraftPattern[]>;
  
  findByHeadCoach(headCoach: string): Promise<TeamDraftPattern[]>;
  
  findByRegime(
    generalManager: string,
    headCoach: string
  ): Promise<TeamDraftPattern | null>;
  
  save(pattern: TeamDraftPattern): Promise<TeamDraftPattern>;
  
  update(pattern: TeamDraftPattern): Promise<TeamDraftPattern>;
  
  delete(teamId: string): Promise<void>;
  
  findAll(): Promise<TeamDraftPattern[]>;
}