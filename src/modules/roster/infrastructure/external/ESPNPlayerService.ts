// src/modules/roster/infrastructure/external/ESPNPlayerService.ts

import axios, { AxiosInstance } from 'axios'

/**
 * Service for fetching player data from ESPN API
 * Used to enrich roster player data with real-time statistics
 */
export class ESPNPlayerService {
  private readonly client: AxiosInstance

  constructor(baseURL: string = 'https://site.api.espn.com') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Fetch player details from ESPN by athlete ID
   */
  async getPlayerByAthleteId(athleteId: string): Promise<ESPNPlayerData | null> {
    try {
      const response = await this.client.get(
        `/apis/site/v2/sports/football/nfl/athletes/${athleteId}`
      )

      if (!response.data) return null

      return this.mapESPNResponse(response.data)
    } catch (error) {
      console.error(`Failed to fetch player ${athleteId} from ESPN:`, error)
      return null
    }
  }

  /**
   * Fetch team roster from ESPN
   */
  async getTeamRoster(teamId: string): Promise<ESPNPlayerData[]> {
    try {
      const response = await this.client.get(
        `/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`
      )

      if (!response.data?.athletes) return []

      return response.data.athletes.map((athlete: any) => this.mapESPNResponse(athlete))
    } catch (error) {
      console.error(`Failed to fetch team ${teamId} roster from ESPN:`, error)
      return []
    }
  }

  /**
   * Search for player by name
   */
  async searchPlayer(name: string): Promise<ESPNPlayerData[]> {
    try {
      const response = await this.client.get(
        `/apis/site/v2/sports/football/nfl/athletes`,
        {
          params: { search: name },
        }
      )

      if (!response.data?.athletes) return []

      return response.data.athletes.map((athlete: any) => this.mapESPNResponse(athlete))
    } catch (error) {
      console.error(`Failed to search for player "${name}" on ESPN:`, error)
      return []
    }
  }

  /**
   * Map ESPN API response to our data structure
   */
  private mapESPNResponse(data: any): ESPNPlayerData {
    return {
      espnId: data.id?.toString() || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      fullName: data.fullName || data.displayName || '',
      position: data.position?.abbreviation || '',
      jerseyNumber: data.jersey ? parseInt(data.jersey) : undefined,
      age: data.age || this.calculateAge(data.dateOfBirth),
      height: data.height ? this.parseHeight(data.height) : undefined,
      weight: data.weight ? parseInt(data.weight) : undefined,
      college: data.college?.name || data.college || undefined,
      experience: data.experience?.years || 0,
      status: data.status?.type || 'active',
      injuryStatus: data.injuries?.[0]?.status || null,
      teamId: data.team?.id?.toString() || null,
      teamName: data.team?.displayName || null,
      teamAbbreviation: data.team?.abbreviation || null,
    }
  }

  /**
   * Parse height string (e.g., "6'2\"" or "6-2") to inches
   */
  private parseHeight(heightStr: string): number {
    const match = heightStr.match(/(\d+)[''-](\d+)/)
    if (match) {
      const feet = parseInt(match[1])
      const inches = parseInt(match[2])
      return feet * 12 + inches
    }
    return 0
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dob: string | undefined): number {
    if (!dob) return 0
    
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }
}

/**
 * ESPN Player Data structure
 */
export interface ESPNPlayerData {
  espnId: string
  firstName: string
  lastName: string
  fullName: string
  position: string
  jerseyNumber?: number
  age: number
  height?: number
  weight?: number
  college?: string
  experience: number
  status: string
  injuryStatus: string | null
  teamId: string | null
  teamName: string | null
  teamAbbreviation: string | null
}