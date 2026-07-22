import type { PrismaClient, Game_gameStatus } from '@prisma/client'
import type {
  GameFact,
  GameFactsRepository,
  ListGameFactsQuery,
  TeamFact,
} from '@/modules/draftOrder/domain/repositories/GameFactsRepository'

export class PrismaGameFactsRepository implements GameFactsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listTeams(): Promise<ReadonlyArray<TeamFact>> {
    const rows = await this.prisma.team.findMany({
      orderBy: [{ conference: 'asc' }, { division: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        abbreviation: true,
        conference: true,
        division: true,
      },
    })

    return rows.map((row) => ({
      teamId: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      conference: row.conference,
      division: row.division,
    }))
  }

  public async listFinalGames(query: ListGameFactsQuery): Promise<ReadonlyArray<GameFact>> {
    const rows = await this.prisma.game.findMany({
      where: {
        seasonYear: query.seasonYear,
        seasonType: query.seasonType,
        gameStatus: 'final' satisfies Game_gameStatus,
        ...(query.throughWeek !== null ? { gameWeek: { lte: query.throughWeek } } : {}),
      },
      orderBy: [{ gameWeek: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        seasonYear: true,
        seasonType: true,
        gameWeek: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        gameStatus: true,
      },
    })

    return rows.map((row) => ({
      gameId: row.id,
      seasonYear: row.seasonYear,
      seasonType: row.seasonType ?? query.seasonType,
      week: row.gameWeek ?? null,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeScore: row.homeScore ?? null,
      awayScore: row.awayScore ?? null,
      status: row.gameStatus,
    }))
  }
}
