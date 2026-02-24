// src/modules/roster/application/dto/rosterPlayer.dto.ts

export interface CreateRosterPlayerDto {
  teamId: number
  playerId?: string | null
  playerName: string
  position: string
  positionGroup: string
  depthChartOrder?: number
  age: number
  yearsExperience: number
  performanceGrade?: number
  isStarter?: boolean
  contractYearsRemaining?: number
  injuryStatus?: string | null
  notes?: string | null
}

export interface UpdateRosterPlayerDto {
  playerName?: string
  position?: string
  positionGroup?: string
  depthChartOrder?: number
  age?: number
  yearsExperience?: number
  performanceGrade?: number
  isStarter?: boolean
  contractYearsRemaining?: number
  injuryStatus?: string | null
  notes?: string | null
}

export interface RosterPlayerResponseDto {
  id: string
  teamId: number
  playerId: string | null
  playerName: string
  position: string
  positionGroup: string
  depthChartOrder: number
  age: number
  yearsExperience: number
  performanceGrade: number
  isStarter: boolean
  contractYearsRemaining: number
  injuryStatus: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface RosterPlayerListDto {
  id: string
  teamId: number
  playerName: string
  position: string
  positionGroup: string
  depthChartOrder: number
  age: number
  yearsExperience: number
  performanceGrade: number
  isStarter: boolean
  injuryStatus: string | null
}

export interface RosterPlayersByTeamDto {
  teamId: number
  teamName?: string
  players: RosterPlayerListDto[]
  starters: RosterPlayerListDto[]
  backups: RosterPlayerListDto[]
}