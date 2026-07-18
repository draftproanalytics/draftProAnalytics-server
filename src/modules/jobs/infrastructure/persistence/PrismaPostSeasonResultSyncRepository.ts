import type { Game_playoffRound, PrismaClient } from '@prisma/client';
import type { SyncPostSeasonResultsResultDto } from '../../domain/dtos/PostSeasonResultSync.dto';
import type { IPostSeasonResultSyncRepository } from '../../domain/repositories/IPostSeasonResultSyncRepository';

const roundRank: Readonly<Record<Game_playoffRound, number>> = {
  WILDCARD: 1,
  DIVISIONAL: 2,
  CONFERENCE: 3,
  SUPERBOWL: 4,
};

const roundLabel: Readonly<Record<Game_playoffRound, string>> = {
  WILDCARD: 'Wild Card',
  DIVISIONAL: 'Divisional',
  CONFERENCE: 'Conference Championship',
  SUPERBOWL: 'Super Bowl',
};

const resultLabelRank: Readonly<Record<string, number>> = {
  'Wild Card': 1,
  Wildcard: 1,
  Divisional: 2,
  'Divisional Round': 2,
  Conference: 3,
  'Conference Championship': 3,
  'Super Bowl': 4,
  SuperBowl: 4,
};

interface TeamResult {
  readonly teamId: number;
  readonly round: Game_playoffRound;
  readonly teamScore: number;
  readonly opponentScore: number;
  readonly winLose: 'W' | 'L';
}

export class PrismaPostSeasonResultSyncRepository implements IPostSeasonResultSyncRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async syncFromGames(seasonYear: number, overwriteExisting: boolean): Promise<SyncPostSeasonResultsResultDto> {
    const games = await this.prisma.game.findMany({
      where: {
        seasonYear: String(seasonYear),
        seasonType: 3,
        
      gameStatus: 'final',
        homeScore: { not: null },
        awayScore: { not: null },
      },
      orderBy: [{ gameDate: 'asc' }, { gameWeek: 'asc' }],
    });

    const latestByTeam = new Map<number, TeamResult>();

    for (const game of games) {
      if (game.homeScore === null || game.awayScore === null) continue;
      const inferredRound: Game_playoffRound | null = game.playoffRound
        ?? (game.gameWeek === 1 ? 'WILDCARD'
          : game.gameWeek === 2 ? 'DIVISIONAL'
            : game.gameWeek === 3 ? 'CONFERENCE'
              : game.gameWeek !== null && game.gameWeek >= 4 ? 'SUPERBOWL' : null);
      if (inferredRound === null) continue;
      const homeWon = game.homeScore > game.awayScore;
      const awayWon = game.awayScore > game.homeScore;
      const candidates: readonly TeamResult[] = [
        { teamId: game.homeTeamId, round: inferredRound, teamScore: game.homeScore, opponentScore: game.awayScore, winLose: homeWon ? 'W' : 'L' },
        { teamId: game.awayTeamId, round: inferredRound, teamScore: game.awayScore, opponentScore: game.homeScore, winLose: awayWon ? 'W' : 'L' },
      ];

      for (const candidate of candidates) {
        const existing = latestByTeam.get(candidate.teamId);
        if (!existing || roundRank[candidate.round] >= roundRank[existing.round]) {
          latestByTeam.set(candidate.teamId, candidate);
        }
      }
    }

    let resultsCreated = 0;
    let resultsUpdated = 0;
    let resultsSkipped = 0;

    for (const result of latestByTeam.values()) {
      const existing = await this.prisma.postSeasonResult.findFirst({
        where: { teamId: result.teamId, playoffYear: seasonYear },
        orderBy: { id: 'asc' },
      });
      const data = {
        playoffYear: seasonYear,
        teamId: result.teamId,
        lastRoundReached: roundLabel[result.round],
        winLose: result.winLose,
        teamScore: result.teamScore,
        opponentScore: result.opponentScore,
      };

      if (!existing) {
        await this.prisma.postSeasonResult.create({ data });
        resultsCreated += 1;
      } else if (overwriteExisting) {
        await this.prisma.postSeasonResult.update({ where: { id: existing.id }, data });
        resultsUpdated += 1;
      } else {
        const missing = existing.lastRoundReached === null
          || existing.winLose === null
          || existing.teamScore === null
          || existing.opponentScore === null;
        const existingRoundRank = existing.lastRoundReached === null
          ? 0
          : (resultLabelRank[existing.lastRoundReached] ?? 0);
        const incomingRoundRank = roundRank[result.round];
        const advancesToLaterRound = incomingRoundRank > existingRoundRank;

        if (advancesToLaterRound) {
          // A later completed playoff game is authoritative progression. This is
          // required for Super Bowl scores to replace Conference Championship
          // summaries even when overwriteExisting is false.
          await this.prisma.postSeasonResult.update({
            where: { id: existing.id },
            data,
          });
          resultsUpdated += 1
        } else if (missing) {
          await this.prisma.postSeasonResult.update({
            where: { id: existing.id },
            data: {
              lastRoundReached: existing.lastRoundReached ?? data.lastRoundReached,
              winLose: existing.winLose ?? data.winLose,
              teamScore: existing.teamScore ?? data.teamScore,
              opponentScore: existing.opponentScore ?? data.opponentScore,
            },
          });
          resultsUpdated += 1;
        } else {
          resultsSkipped += 1;
        }
      }
    }

    return {
      seasonYear,
      completedPostseasonGames: games.length,
      teamsProcessed: latestByTeam.size,
      resultsCreated,
      resultsUpdated,
      resultsSkipped,
    };
  }
}
