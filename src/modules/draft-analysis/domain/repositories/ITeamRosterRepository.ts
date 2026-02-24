// src/modules/draft-analysis/domain/repositories/ITeamRosterRepository.ts
import { PositionGroup } from '../value-objects/PositionGroup.vo';

export interface RosterPlayer {
  id: string;
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  positionGroup: PositionGroup;
  depthChartOrder: number;
  age: number;
  yearsExperience: number;
  performanceGrade: number; // 0-100
  isStarter: boolean;
  contractYearsRemaining: number;
}

export interface PositionalDepth {
  position: PositionGroup;
  starters: RosterPlayer[];
  backups: RosterPlayer[];
  averageAge: number;
  averagePerformance: number;
  needSeverity: number; // 0-100
}

export interface ITeamRosterRepository {
  findByTeamId(teamId: string): Promise<RosterPlayer[]>;
  
  findByTeamAndPosition(
    teamId: string,
    position: PositionGroup
  ): Promise<RosterPlayer[]>;
  
  findStarters(teamId: string): Promise<RosterPlayer[]>;
  
  findByDepthChart(
    teamId: string,
    position: PositionGroup
  ): Promise<RosterPlayer[]>;
  
  getPositionalDepth(
    teamId: string,
    position: PositionGroup
  ): Promise<PositionalDepth>;
  
  getAllPositionalDepths(teamId: string): Promise<PositionalDepth[]>;
  
  save(player: RosterPlayer): Promise<RosterPlayer>;
  
  update(player: RosterPlayer): Promise<RosterPlayer>;
  
  delete(id: string): Promise<void>;
}