// src/application/playoffs/dtos/PlayoffBracketEventDto.ts
export type PlayoffRound = 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPERBOWL'
export type PlayoffConference = 'AFC' | 'NFC'

export interface PlayoffBracketEventDto {
  id: number

  date: string | null

  status: string
  statusDetail?: string | null

  homeTeamId: number | null // ESPN team id (or -1 for TBD)
  awayTeamId: number | null
  homeTeamName: string
  awayTeamName: string

  homeTeamConference: string
  awayTeamConference: string

  homeScore: number | null
  awayScore: number | null
  homeWinner: boolean
  awayWinner: boolean

  isPlayoff: boolean
  playoffRound: PlayoffRound | null
  playoffConference: PlayoffConference | null

  homeSeed: number | null
  awaySeed: number | null
  homeTeamDbId: number | null // your DB Team.id
  awayTeamDbId: number | null
}
