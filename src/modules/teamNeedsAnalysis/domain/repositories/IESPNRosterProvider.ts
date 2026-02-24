// src/modules/teamNeedsAnalysis/domain/repositories/IESPNRosterProvider.ts

export interface ESPNPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  age?: number;
  experience?: number;
  status?: string;
  jersey?: string;
}

export interface ESPNRosterData {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  athletes: ESPNPlayer[];
}

export interface IESPNRosterProvider {
  /**
   * Fetch current roster for a team from ESPN
   */
  fetchTeamRoster(teamId: number): Promise<ESPNRosterData>;

  /**
   * Fetch rosters for all NFL teams
   */
  fetchAllRosters(): Promise<ESPNRosterData[]>;
}