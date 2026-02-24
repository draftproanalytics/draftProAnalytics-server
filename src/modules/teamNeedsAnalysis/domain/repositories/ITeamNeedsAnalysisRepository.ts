// src/modules/teamNeedsAnalysis/domain/repositories/ITeamNeedsAnalysisRepository.ts

import { TeamNeedsAnalysis } from "../entities/teamNeedsAnalysis.entity";


export interface ITeamNeedsAnalysisRepository {
  /**
   * Save or update team needs analysis
   */
  save(analysis: TeamNeedsAnalysis): Promise<TeamNeedsAnalysis>;

  /**
   * Find analysis by team and season
   */
  findByTeamAndSeason(teamId: number, seasonYear: number): Promise<TeamNeedsAnalysis | null>;

  /**
   * Find latest analysis for a team
   */
  findLatestByTeam(teamId: number): Promise<TeamNeedsAnalysis | null>;

  /**
   * Find all analyses for a season
   */
  findBySeason(seasonYear: number): Promise<TeamNeedsAnalysis[]>;

  /**
   * Delete analysis
   */
  delete(teamId: number, seasonYear: number): Promise<void>;

  /**
   * Check if analysis exists
   */
  exists(teamId: number, seasonYear: number): Promise<boolean>;
}