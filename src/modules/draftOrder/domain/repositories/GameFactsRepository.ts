import type { Game_gameStatus } from '@prisma/client'

export interface TeamFact {
  readonly teamId: number
  readonly name: string
  readonly abbreviation: string | null
  readonly conference: string | null
  readonly division: string | null
}

export interface GameFact {
  readonly gameId: number
  readonly seasonYear: string
  readonly seasonType: number
  readonly week: number | null
  readonly homeTeamId: number
  readonly awayTeamId: number
  readonly homeScore: number | null
  readonly awayScore: number | null
  readonly status: Game_gameStatus
}

export interface ListGameFactsQuery {
  readonly seasonYear: string
  readonly seasonType: number
  readonly throughWeek: number | null
}

export interface GameFactsRepository {
  listTeams(): Promise<ReadonlyArray<TeamFact>>
  listFinalGames(query: ListGameFactsQuery): Promise<ReadonlyArray<GameFact>>
}
