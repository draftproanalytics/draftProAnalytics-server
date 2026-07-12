// src/modules/teamNeedsAnalysis/domain/repositories/IRosterRepository.ts

import { RosterPlayer } from '../services/RosterAnalyzer.service';

export interface IRosterRepository {
  /**
   * Find all roster players for a team
   */
  findByTeamId(teamId: number): Promise<RosterPlayer[]>;

  /**
   * Find roster players by position
   */
  findByPosition(teamId: number, position: string): Promise<RosterPlayer[]>;

  /**
   * Find roster players by position group
   */
  findByPositionGroup(teamId: number, positionGroup: string): Promise<RosterPlayer[]>;

  /**
   * Find starters for a team
   */
  findStarters(teamId: number): Promise<RosterPlayer[]>;

  /**
   * Get all teams with roster data
   */
  getAllTeamIds(): Promise<number[]>;
}