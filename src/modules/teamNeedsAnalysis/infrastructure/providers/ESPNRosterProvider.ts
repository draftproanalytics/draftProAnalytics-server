// src/modules/teamNeedsAnalysis/infrastructure/providers/ESPNRosterProvider.ts

import axios from 'axios';
import { IESPNRosterProvider, ESPNRosterData, ESPNPlayer } from '../../domain/repositories/IESPNRosterProvider';
import { endpoints } from '@/espn/endpoints';

export class ESPNRosterProvider implements IESPNRosterProvider {
  private readonly axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      },
    });
  }

  async fetchTeamRoster(teamId: number): Promise<ESPNRosterData> {
    try {
      const url = endpoints.teamRoster(teamId);
      const response = await this.axiosInstance.get(url);

      return this.parseRosterResponse(response.data);
    } catch (error) {
      console.error(`Failed to fetch roster for team ${teamId}:`, error);
      throw new Error(`ESPN API error: Unable to fetch roster for team ${teamId}`);
    }
  }

  async fetchAllRosters(): Promise<ESPNRosterData[]> {
    try {
      // First, get all teams
      const teamsResponse = await this.axiosInstance.get(endpoints.teams());
      const teams = teamsResponse.data.sports[0].leagues[0].teams;

      const rosters: ESPNRosterData[] = [];

      // Fetch roster for each team with delay to avoid rate limiting
      for (const teamWrapper of teams) {
        const team = teamWrapper.team;
        try {
          const roster = await this.fetchTeamRoster(team.id);
          rosters.push(roster);

          // Add small delay to be nice to ESPN API
          await this.delay(100);
        } catch (error) {
          console.error(`Failed to fetch roster for team ${team.id}:`, error);
          // Continue with other teams
        }
      }

      return rosters;
    } catch (error) {
      console.error('Failed to fetch all rosters:', error);
      throw new Error('ESPN API error: Unable to fetch team rosters');
    }
  }

  private parseRosterResponse(data: any): ESPNRosterData {
    const team = data.team;
    const athletes: ESPNPlayer[] = [];

    // ESPN returns athletes in a nested structure
    if (team.athletes && Array.isArray(team.athletes)) {
      for (const athlete of team.athletes) {
        athletes.push({
          id: athlete.id,
          firstName: athlete.firstName || '',
          lastName: athlete.lastName || '',
          position: athlete.position?.abbreviation || 'UNK',
          age: athlete.age,
          experience: athlete.experience?.years,
          status: athlete.status?.type,
          jersey: athlete.jersey,
        });
      }
    }

    return {
      teamId: team.id,
      teamName: team.displayName || team.name,
      teamAbbreviation: team.abbreviation,
      athletes,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}