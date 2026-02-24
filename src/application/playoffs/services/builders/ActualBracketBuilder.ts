// src/application/playoffs/services/builders/ActualBracketBuilder.ts
import type {
  PlayoffBracket,
  PlayoffRoundGroup,
} from '@/domain/playoffs/valueObjects/PlayoffBracket';
import type {
  PlayoffMatchup,
  PlayoffConference,
  PlayoffRound,
} from '@/domain/playoffs/valueObjects/PlayoffTypes';
import type {
  PlayoffGameSummary,
  IGameRepository,
} from '@/domain/game/repositories/IGameRepository';
import type { TeamStanding } from '@/domain/standings/interface/TeamStanding';
import type { GameWithTeams } from '@/application/standings/services/ComputeStandingsService';
import {
  PlayoffSeedingService,
  SeededTeam,
} from '@/application/standings/services/PlayoffSeedingService';
import { buildGamesWithTeams } from '@/application/standings/util/buildGamesWithTeams';
import { createLogger } from '@/utils/Logger';

const norm = (v: unknown): string =>
  String(v ?? '')
    .trim()
    .toUpperCase();

const logger = createLogger('ActualBracketBuilder');
export class ActualBracketBuilder {
  constructor(
    private readonly gameRepo: IGameRepository,
    private readonly seeding: PlayoffSeedingService
  ) {}

  public async build(
    seasonYear: number,
    allStandings: TeamStanding[],
    playoffGames: PlayoffGameSummary[]
  ): Promise<PlayoffBracket> {
    const regularSeasonGames = await this.gameRepo.findRegularSeasonGames(
      undefined,
      String(seasonYear)
    );
    logger.debug('build() - calling buildGamesWithTeams');
    const gamesWithTeams = buildGamesWithTeams({
      games: regularSeasonGames,
      standings: allStandings,

      seasonYear,
    });

    // Compute seeds for all teams together
    const allSeeds = this.seeding.computeSeeds(allStandings, gamesWithTeams);

    logger.debug('build() - FIND AFC/NFC SEEDS');
    // Filter results by conference
    const afcSeeds = allSeeds.filter((s) => {
      const team = allStandings.find((t) => t.teamId === s.teamId);
      return team && norm(team.conference) === 'AFC';
    });

    const nfcSeeds = allSeeds.filter((s) => {
      const team = allStandings.find((t) => t.teamId === s.teamId);
      return team && norm(team.conference) === 'NFC';
    });
    logger.debug('build() - build CONF round');
    const afcRounds = this.buildConference('AFC', seasonYear, afcSeeds, playoffGames);
    const nfcRounds = this.buildConference('NFC', seasonYear, nfcSeeds, playoffGames);
    logger.debug('build() - build SUPEBOWL round');
    const superBowl = this.buildSuperBowl(seasonYear, playoffGames);
    logger.debug('build() - afcRounds: ' + JSON.stringify(afcRounds, null, 2));
    logger.debug('build() - nfcRounds: ' + JSON.stringify(nfcRounds, null, 2));
    logger.debug('build() - superbowl: ' + JSON.stringify(superBowl, null, 2));
    return { seasonYear, afcRounds, nfcRounds, superBowl };
  }

  private buildConference(
    conference: PlayoffConference,
    seasonYear: number,
    seeds: SeededTeam[],
    games: PlayoffGameSummary[]
  ): PlayoffRoundGroup[] {
    const wildcard = this.buildRound('WILDCARD', conference, seasonYear, seeds, games);
    const divisional = this.buildRound('DIVISIONAL', conference, seasonYear, seeds, games);
    const conf = this.buildRound('CONFERENCE', conference, seasonYear, seeds, games);

    return [wildcard, divisional, conf];
  }

  // In ActualBracketBuilder.ts

  private buildRound(
    round: Extract<PlayoffRound, 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE'>,
    conference: PlayoffConference,
    seasonYear: number,
    seeds: SeededTeam[],
    games: PlayoffGameSummary[]
  ): PlayoffRoundGroup {
    // ✅ Add diagnostic logging
    logger.debug(`🔍 [buildRound] Called with:`, {
      round,
      conference,
      seasonYear,
      totalGames: games.length,
    });

    if (games.length > 0) {
      logger.debug(`🔍 [buildRound] First game from repo:`, {
        id: games[0].id,
        playoffRound: games[0].playoffRound,
        playoffConference: games[0].playoffConference,
        seasonYear: games[0].seasonYear,
        homeScore: games[0].homeScore,
        awayScore: games[0].awayScore,
      });
    }

    const existing = games.filter((g) => {
      const match =
        g.seasonYear === seasonYear &&
        //                   g.playoffConference === conference &&
        g.playoffRound === round;

      if (!match && games.indexOf(g) === 0) {
        logger.debug(`🔍 [buildRound] Filter check for first game:`, {
          seasonYearMatch: g.seasonYear === seasonYear,
          //         conferenceMatch: g.playoffConference === conference,
          roundMatch: g.playoffRound === round,
          expected: { round, conference, seasonYear },
          actual: {
            playoffRound: g.playoffRound,
            playoffConference: g.playoffConference,
            seasonYear: g.seasonYear,
          },
        });
      }

      return match;
    });

    logger.debug(`🔍 [buildRound] ${conference} ${round}: found ${existing.length} games`);

    if (existing.length > 0) {
      logger.debug(`   Sample:`, {
        id: existing[0].id,
        teams: `${existing[0].homeTeamId} vs ${existing[0].awayTeamId}`,
        score: `${existing[0].homeScore}-${existing[0].awayScore}`,
      });
    }

    const matchups: PlayoffMatchup[] =
      existing.length > 0
        ? existing.map((g, index) => ({
            gameId: g.id,
            seasonYear,
            round,
            conference,
            slot: `${conference}_${round}_${index + 1}`,
            homeTeamId: g.homeTeamId,
            awayTeamId: g.awayTeamId,
            homeSeed: g.homeSeed,
            awaySeed: g.awaySeed,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            winnerTeamId: this.winner(g.homeTeamId, g.awayTeamId, g.homeScore, g.awayScore),
            gameDate: g.gameDate,
            homeTeamName: g.homeTeamName,
            awayTeamName: g.awayTeamName,
            homeTeamConference: g.homeTeamConference,
            awayTeamConference: g.awayTeamConference,
          }))
        : this.projectWildcardIfMissing(round, conference, seasonYear, seeds);

    return { round, conference, matchups };
  }

  private projectWildcardIfMissing(
    round: PlayoffRound,
    conference: PlayoffConference,
    seasonYear: number,
    seeds: SeededTeam[]
  ): PlayoffMatchup[] {
    if (round !== 'WILDCARD') return [];

    const pairs: Array<[number, number]> = [
      [2, 7],
      [3, 6],
      [4, 5],
    ];

    return pairs.map(([homeSeedNum, awaySeedNum]) => {
      const home = seeds.find((s) => s.seed === homeSeedNum);
      const away = seeds.find((s) => s.seed === awaySeedNum);

      return {
        gameId: null,
        seasonYear,
        round: 'WILDCARD' as const,
        conference,
        slot: `${conference}_WILDCARD_${homeSeedNum}v${awaySeedNum}`,
        homeTeamId: home?.teamId ?? null,
        awayTeamId: away?.teamId ?? null,
        homeSeed: home?.seed ?? null,
        awaySeed: away?.seed ?? null,
        homeScore: null,
        awayScore: null,
        winnerTeamId: null,
        gameDate: null,
      };
    });
  }

  private buildSuperBowl(seasonYear: number, games: PlayoffGameSummary[]): PlayoffMatchup | null {
    // Find conference championship games
    logger.debug('buildSuperBowl() - entryPoint');
    const afcChamp = games.find(
      (g) =>
        g.seasonYear === seasonYear &&
        g.playoffRound === 'CONFERENCE' &&
        g.playoffConference === 'AFC'
    );
    const nfcChamp = games.find(
      (g) =>
        g.seasonYear === seasonYear &&
        g.playoffRound === 'CONFERENCE' &&
        g.playoffConference === 'NFC'
    );

    // Determine AFC representative
    const afcTeamId = afcChamp
      ? this.winner(
          afcChamp.homeTeamId,
          afcChamp.awayTeamId,
          afcChamp.homeScore,
          afcChamp.awayScore
        )
      : null;

    // Determine NFC representative
    const nfcTeamId = nfcChamp
      ? this.winner(
          nfcChamp.homeTeamId,
          nfcChamp.awayTeamId,
          nfcChamp.homeScore,
          nfcChamp.awayScore
        )
      : null;

    // Find actual Super Bowl game record (if it exists with results)
    const sb = games.find((g) => g.seasonYear === seasonYear && g.playoffRound === 'SUPERBOWL');

    // If no conference champions determined yet, return null
    if (!afcTeamId && !nfcTeamId) {
      return null;
    }

    return {
      gameId: sb?.id ?? null,
      seasonYear,
      round: 'SUPERBOWL',
      conference: 'AFC', // arbitrary - Super Bowl doesn't belong to one conference
      slot: 'SUPERBOWL',
      homeTeamId: afcTeamId, // AFC team is typically "home" (though it alternates in reality)
      awayTeamId: nfcTeamId,
      homeSeed: null, // Seeds don't apply to Super Bowl
      awaySeed: null,
      homeScore: sb?.homeScore ?? null,
      awayScore: sb?.awayScore ?? null,
      winnerTeamId: sb
        ? this.winner(sb.homeTeamId, sb.awayTeamId, sb.homeScore, sb.awayScore)
        : null,
      gameDate: sb?.gameDate ?? null,
      homeTeamName: sb?.homeTeamName,
      awayTeamName: sb?.awayTeamName,
      homeTeamConference: sb?.homeTeamConference,
      awayTeamConference: sb?.awayTeamConference,
    };
  }

  private winner(
    homeTeamId: number,
    awayTeamId: number,
    homeScore: number | null,
    awayScore: number | null
  ): number | null {
    if (homeScore == null || awayScore == null) return null;
    if (homeScore > awayScore) return homeTeamId;
    if (awayScore > homeScore) return awayTeamId;
    return null;
  }
}
