// src/modules/rosterSync/application/services/RosterSync.service.ts

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

interface ESPNAthlete {
  id: string;
  uid: string;
  guid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
  shortName: string;
  jersey?: string;
  position: {
    id: string;
    name: string;
    displayName: string;
    abbreviation: string;
  };
  age?: number;
  dateOfBirth?: string;
  birthPlace?: {
    city?: string;
    state?: string;
    country?: string;
  };
  college?: {
    id?: string;
    name?: string;
    shortName?: string;
  };
  experience?: {
    years?: number;
  };
  status?: {
    id: string;
    name: string;
    type: string;
    abbreviation: string;
  };
  height?: number;
  weight?: number;
  headshot?: {
    href?: string;
    alt?: string;
  };
  depthChart?: {
    position?: string;
    rank?: number;
  };
  contract?: {
    salary?: number;
  };
}

interface ESPNTeamRoster {
  team: {
    id: string;
    uid: string;
    slug: string;
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    name: string;
    nickname: string;
    location: string;
    color: string;
    alternateColor: string;
  };
  athletes: ESPNAthlete[];
}

export interface RosterSyncResult {
  success: boolean;
  teamId: number;
  teamName: string;
  playersProcessed: number;
  playersCreated: number;
  playersUpdated: number;
  rosterPlayersCreated: number;
  errors: string[];
}

export interface BulkSyncResult {
  success: boolean;
  totalTeams: number;
  successfulTeams: number;
  failedTeams: number;
  totalPlayers: number;
  totalRosterEntries: number;
  results: RosterSyncResult[];
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

export class RosterSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Sync roster for a single team
   */
  async syncTeamRoster(teamId: number): Promise<RosterSyncResult> {
    const errors: string[] = [];
    let playersCreated = 0;
    let playersUpdated = 0;
    let rosterPlayersCreated = 0;

    try {
      // Get team info from database
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        throw new Error(`Team with ID ${teamId} not found in database`);
      }

      console.log(`📡 Fetching roster for ${team.name} (${team.abbreviation})`);
      let abbrev = team.abbreviation ? team.abbreviation : '';
      // Fetch roster from ESPN
      const espnData = await this.fetchESPNRoster(abbrev);

      // Extract athletes from response using helper method
      const athletes = this.extractAthletes(espnData);
      
      if (athletes.length === 0) {
        console.log(`⚠️  No athletes found for ${team.name}`);
        return {
          success: false,
          teamId,
          teamName: team.name,
          playersProcessed: 0,
          playersCreated: 0,
          playersUpdated: 0,
          rosterPlayersCreated: 0,
          errors: ['No athletes found in ESPN response'],
        };
      }

      console.log(`📥 Received ${athletes.length} athletes from ESPN`);

      // Log first athlete structure for debugging
      if (athletes.length > 0) {
        console.log('🔍 Sample athlete structure:', JSON.stringify(athletes[0], null, 2));
      }

      // Process each athlete
      for (const athlete of athletes) {
        try {
          // Upsert Player
          const player = await this.upsertPlayer(athlete, teamId);
          
          if (player.created) {
            playersCreated++;
          } else {
            playersUpdated++;
          }

          // Create/Update rosterPlayers entry
          await this.upsertRosterPlayer(athlete, teamId, player.id);
          rosterPlayersCreated++;

        } catch (error) {
          const errorMsg = `Failed to process athlete ${athlete.displayName}: ${(error as Error).message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        teamId,
        teamName: team.name,
        playersProcessed: athletes.length,
        playersCreated,
        playersUpdated,
        rosterPlayersCreated,
        errors,
      };

    } catch (error) {
      console.error(`❌ Failed to sync roster for team ${teamId}:`, error);
      return {
        success: false,
        teamId,
        teamName: 'Unknown',
        playersProcessed: 0,
        playersCreated: 0,
        playersUpdated: 0,
        rosterPlayersCreated: 0,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Sync rosters for all teams
   */
  async syncAllTeamRosters(): Promise<BulkSyncResult> {
    const startTime = new Date();
    const results: RosterSyncResult[] = [];

    try {
      // Get all teams from database
      const teams = await this.prisma.team.findMany({
        orderBy: { id: 'asc' },
      });

      console.log(`🔄 Starting bulk roster sync for ${teams.length} teams`);

      for (const team of teams) {
        console.log(`\n📋 Processing team ${team.id}/${teams.length}: ${team.name}`);
        
        const result = await this.syncTeamRoster(team.id);
        results.push(result);

        // Add delay to be nice to ESPN API
        await this.delay(500); // 500ms between requests
      }

      const endTime = new Date();
      const successfulTeams = results.filter(r => r.success).length;
      const totalPlayers = results.reduce((sum, r) => sum + r.playersProcessed, 0);
      const totalRosterEntries = results.reduce((sum, r) => sum + r.rosterPlayersCreated, 0);

      return {
        success: successfulTeams === teams.length,
        totalTeams: teams.length,
        successfulTeams,
        failedTeams: teams.length - successfulTeams,
        totalPlayers,
        totalRosterEntries,
        results,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };

    } catch (error) {
      const endTime = new Date();
      console.error('❌ Bulk sync failed:', error);
      
      return {
        success: false,
        totalTeams: 0,
        successfulTeams: 0,
        failedTeams: 0,
        totalPlayers: 0,
        totalRosterEntries: 0,
        results,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    }
  }

  /**
   * Fetch roster from ESPN API
   */
  private async fetchESPNRoster(teamAbbreviation: string): Promise<any> {
    const url = `${ESPN_BASE}/teams/${teamAbbreviation}?enable=roster`;
    
    try {
      console.log(`🌐 Fetching from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        },
      });

      // Log response structure for debugging
      console.log('📦 ESPN Response keys:', Object.keys(response.data));
      if (response.data.team) {
        console.log('📦 ESPN team keys:', Object.keys(response.data.team));
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ ESPN API error for ${teamAbbreviation}:`, error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw new Error(`ESPN API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Extract athletes array from ESPN response (handles different response structures)
   */
  private extractAthletes(espnData: any): ESPNAthlete[] {
    // Try different possible locations in the response
    const possiblePaths = [
      espnData.team?.athletes,           // Most common
      espnData.athletes,                 // Alternative
      espnData.team?.roster?.athletes,   // Another possibility
      espnData.roster?.athletes,         // Another possibility
    ];

    for (const athletes of possiblePaths) {
      if (Array.isArray(athletes) && athletes.length > 0) {
        return athletes;
      }
    }

    // If we can't find athletes, log the structure to help debug
    console.error('❌ Could not find athletes in ESPN response');
    console.error('Response structure:', JSON.stringify(espnData, null, 2).substring(0, 500));
    
    return [];
  }

  /**
   * Upsert player to Player table
   */
  private async upsertPlayer(athlete: ESPNAthlete, teamId: number): Promise<{ id: number; created: boolean }> {
    // Check if player already exists
    const existingPlayer = await this.prisma.player.findUnique({
      where: { espnAthleteId: athlete.id },
    });

    const playerData = {
      espnAthleteId: athlete.id,
      firstName: athlete.firstName || athlete.displayName?.split(' ')[0] || '',
      lastName: athlete.lastName || athlete.displayName?.split(' ').slice(1).join(' ') || '',
      age: athlete.age || this.calculateAge(athlete.dateOfBirth) || 0,
      height: athlete.height || null,
      weight: athlete.weight || null,
      homeCity: athlete.birthPlace?.city || null,
      homeState: athlete.birthPlace?.state || null,
      university: athlete.college?.name || null,
      status: athlete.status?.name || null,
      position: athlete.position?.abbreviation || null,
      yearEnteredLeague: this.calculateYearEnteredLeague(athlete.experience?.years),
    };

    if (existingPlayer) {
      // Update existing player
      const updated = await this.prisma.player.update({
        where: { id: existingPlayer.id },
        data: playerData,
      });
      return { id: updated.id, created: false };
    } else {
      // Create new player
      const created = await this.prisma.player.create({
        data: playerData,
      });
      return { id: created.id, created: true };
    }
  }

  /**
   * Upsert roster player entry
   */
  private async upsertRosterPlayer(athlete: ESPNAthlete, teamId: number, playerId: number): Promise<void> {
    const positionGroup = this.getPositionGroup(athlete.position?.abbreviation || '');
    
    // Extract player name with fallbacks
    const playerName = athlete.displayName 
      || athlete.fullName 
      || athlete.shortName 
      || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim()
      || `Player ${athlete.id}`;
    
    const rosterData = {
      teamId,
      playerId: athlete.id, // ESPN athlete ID
      playerName,
      position: athlete.position?.abbreviation || 'UNK',
      positionGroup,
      depthChartOrder: athlete.depthChart?.rank || 99,
      age: athlete.age || this.calculateAge(athlete.dateOfBirth) || 0,
      yearsExperience: athlete.experience?.years || 0,
      performanceGrade: 50.0, // Default - can be updated later
      isStarter: (athlete.depthChart?.rank || 99) === 1,
      contractYearsRemaining: 0, // Default - can be updated later
      injuryStatus: athlete.status?.name === 'Active' ? null : athlete.status?.name || null,
      notes: null,
    };

    // Check if roster entry exists
    const existing = await this.prisma.rosterPlayers.findFirst({
      where: {
        teamId,
        playerId: athlete.id,
      },
    });

    if (existing) {
      // Update existing
      await this.prisma.rosterPlayers.update({
        where: { id: existing.id },
        data: rosterData,
      });
    } else {
      // Create new
      await this.prisma.rosterPlayers.create({
        data: rosterData,
      });
    }
  }

  /**
   * Get position group from position abbreviation
   */
  private getPositionGroup(position: string): string {
    const groups: Record<string, string> = {
      QB: 'QB',
      RB: 'RB',
      FB: 'RB',
      WR: 'WR',
      TE: 'TE',
      OL: 'OL',
      C: 'OL',
      G: 'OL',
      T: 'OL',
      DL: 'DL',
      DE: 'DL',
      DT: 'DL',
      NT: 'DL',
      LB: 'LB',
      MLB: 'LB',
      OLB: 'LB',
      ILB: 'LB',
      DB: 'DB',
      CB: 'DB',
      S: 'DB',
      FS: 'DB',
      SS: 'DB',
      K: 'ST',
      P: 'ST',
      LS: 'ST',
    };

    return groups[position] || 'UNK';
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth?: string): number {
    if (!dateOfBirth) return 0;
    
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Calculate year entered league from years of experience
   */
  private calculateYearEnteredLeague(yearsExperience?: number): number | null {
    if (yearsExperience === undefined || yearsExperience === null) return null;
    return new Date().getFullYear() - yearsExperience;
  }

  /**
   * Get roster sync status
   */
  async getRosterSyncStatus(): Promise<{
    totalTeams: number;
    teamsWithRosterData: number;
    teamsWithoutRosterData: number;
    totalPlayers: number;
    totalRosterEntries: number;
    lastSyncDate?: Date;
  }> {
    const [totalTeams, rosterEntries, players] = await Promise.all([
      this.prisma.team.count(),
      this.prisma.rosterPlayers.groupBy({
        by: ['teamId'],
      }),
      this.prisma.player.count(),
    ]);

    const teamsWithRosterData = rosterEntries.length;
    const totalRosterEntries = await this.prisma.rosterPlayers.count();

    // Get most recent roster entry to determine last sync
    const lastEntry = await this.prisma.rosterPlayers.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return {
      totalTeams,
      teamsWithRosterData,
      teamsWithoutRosterData: totalTeams - teamsWithRosterData,
      totalPlayers: players,
      totalRosterEntries,
      lastSyncDate: lastEntry?.updatedAt,
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}