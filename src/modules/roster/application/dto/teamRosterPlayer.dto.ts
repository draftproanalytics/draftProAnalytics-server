export interface TeamRosterPlayerDto {
  playerTeamId: number
  playerId: number
  teamId: number
  playerName: string
  firstName: string
  lastName: string
  position: string | null
  jerseyNumber: number | null
  currentTeam: boolean
  isActive: boolean
  startYear: number | null
  endYear: number | null
  age: number
  yearsExperience: number
  university: string | null
  status: string | null
}
