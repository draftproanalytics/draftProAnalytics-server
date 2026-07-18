import type { Game_playoffRound, Prisma, PrismaClient } from '@prisma/client';
import type { NflGameEventDto } from '../../domain/dtos/NflGameEvent.dto';
import type {
  IGameScheduleRepository,
  UpsertGameResultDto,
} from '../../domain/repositories/IGameScheduleRepository';
import type { ITeamIdentityResolver } from '../../domain/repositories/ITeamIdentityResolver';

const resolvePlayoffRound = (seasonType: number, week: number): Game_playoffRound | null => {
  if (seasonType !== 3) return null;
  if (week === 1) return 'WILDCARD';
  if (week === 2) return 'DIVISIONAL';
  if (week === 3) return 'CONFERENCE';
  if (week >= 4) return 'SUPERBOWL';
  return null;
};

export class PrismaGameScheduleRepository implements IGameScheduleRepository {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly teamIdentityResolver: ITeamIdentityResolver,
  ) {}

  public async upsertImportedGames(events: readonly NflGameEventDto[]): Promise<UpsertGameResultDto> {
    let insertedOrUpdated = 0;
    let skipped = 0;
    const skippedReasons: string[] = [];

    for (const event of events) {
      const homeTeam = await this.teamIdentityResolver.resolveDpaTeamId(event.homeTeam);
      const awayTeam = await this.teamIdentityResolver.resolveDpaTeamId(event.awayTeam);

      if (!homeTeam || !awayTeam) {
        skipped += 1;
        skippedReasons.push(
          `Skipped ESPN event ${event.espnEventId}: unresolved team mapping ` +
            `${event.awayTeam.abbreviation}@${event.homeTeam.abbreviation}.`,
        );
        continue;
      }

      await this.upsertGame(event, homeTeam.dpaTeamId, awayTeam.dpaTeamId);
      insertedOrUpdated += 1;
    }

    return {
      insertedOrUpdated,
      skipped,
      skippedReasons,
    };
  }

  private async upsertGame(
    event: NflGameEventDto,
    homeTeamId: number,
    awayTeamId: number,
  ): Promise<void> {
    const gameStatus = event.status as Prisma.GameUncheckedCreateInput['gameStatus'];

    await this.prisma.game.upsert({
      where: {
        espnEventId: event.espnEventId,
      },
      create: {
        seasonYear: String(event.seasonYear),
        seasonType: event.seasonType,
        gameWeek: event.week,
        gameDate: event.gameDate,
        homeTeamId,
        awayTeamId,
        gameLocation: event.venueName,
        gameCity: event.city,
        gameStateProvince: event.stateProvince,
        gameCountry: event.country,
        homeScore: event.homeScore ?? 0,
        awayScore: event.awayScore ?? 0,
        gameStatus,
        isPlayoff: event.isPlayoff,
        playoffRound: resolvePlayoffRound(event.seasonType, event.week),
        espnEventId: event.espnEventId,
        espnCompetitionId: event.espnCompetitionId,
      },
      update: {
        seasonType: event.seasonType,
        gameWeek: event.week,
        gameDate: event.gameDate,
        homeTeamId,
        awayTeamId,
        gameLocation: event.venueName,
        gameCity: event.city,
        gameStateProvince: event.stateProvince,
        gameCountry: event.country,
        homeScore: event.homeScore ?? 0,
        awayScore: event.awayScore ?? 0,
        gameStatus,
        isPlayoff: event.isPlayoff,
        playoffRound: resolvePlayoffRound(event.seasonType, event.week),
        espnCompetitionId: event.espnCompetitionId,
        updatedAt: new Date(),
      },
    });
  }
}
