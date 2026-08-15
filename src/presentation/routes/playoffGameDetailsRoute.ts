import { Router } from 'express';
import { prisma } from '@/infrastructure/database/prisma';

type JsonObject = Record<string, unknown>;

const asObject = (value: unknown): JsonObject | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonObject) : null;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;
const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const nested = (value: unknown, ...keys: string[]): unknown => {
  let current: unknown = value;
  for (const key of keys) {
    const object = asObject(current);
    if (!object) return null;
    current = object[key];
  }
  return current;
};


const toRoman = (value: number): string => {
  const numerals: ReadonlyArray<readonly [number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let remaining = value;
  let result = '';
  for (const [amount, symbol] of numerals) {
    while (remaining >= amount) {
      result += symbol;
      remaining -= amount;
    }
  }
  return result;
};

const superBowlNumberForSeason = (seasonYear: number): number => seasonYear - 1965;


const resolvePlayoffTitle = (
  playoffRound: string | null,
  conference: string | null,
  seasonYear: number
): string => {
  switch (playoffRound) {
    case 'WILDCARD':
      return conference ? `${conference} Wild Card` : 'Wild Card';
    case 'DIVISIONAL':
      return conference ? `${conference} Divisional Round` : 'Divisional Round';
    case 'CONFERENCE':
      return conference ? `${conference} Championship` : 'Conference Championship';
    case 'SUPERBOWL':
      return `Super Bowl ${toRoman(superBowlNumberForSeason(seasonYear))}`;
    default:
      return 'Playoff Game';
  }
};

interface TeamSummary {
  readonly id: string | null;
  readonly abbreviation: string;
  readonly displayName: string;
  readonly logoUrl: string | null;
  readonly score: number | null;
  readonly winner: boolean;
  readonly record: string | null;
  readonly linescores: number[];
}

interface StatRow {
  readonly label: string;
  readonly away: string;
  readonly home: string;
}

interface LeaderRow {
  readonly category: string;
  readonly away: string | null;
  readonly home: string | null;
}

interface PlayRow {
  readonly period: number | null;
  readonly clock: string | null;
  readonly text: string;
  readonly awayScore: number | null;
  readonly homeScore: number | null;
}

const competitorRecord = (competitor: JsonObject): string | null => {
  const records = asArray(competitor.records);
  for (const recordValue of records) {
    const record = asObject(recordValue);
    if (asString(record?.type) === 'total') return asString(record?.summary);
  }
  return asString(nested(records[0], 'summary'));
};

const mapCompetitor = (value: unknown): TeamSummary | null => {
  const competitor = asObject(value);
  const team = asObject(competitor?.team);
  if (!competitor || !team) return null;

  const linescores = asArray(competitor.linescores)
    .map((line) => asNumber(nested(line, 'value')))
    .filter((score): score is number => score !== null);

  return {
    id: asString(team.id),
    abbreviation: asString(team.abbreviation) ?? 'TBD',
    displayName: asString(team.displayName) ?? asString(team.name) ?? 'TBD',
    logoUrl: asString(team.logo),
    score: asNumber(competitor.score),
    winner: competitor.winner === true,
    record: competitorRecord(competitor),
    linescores,
  };
};

const statValue = (stats: unknown[], name: string): string => {
  const hit = stats.map(asObject).find((stat) => asString(stat?.name) === name);
  return asString(hit?.displayValue) ?? '—';
};

const mapStats = (boxscore: JsonObject | null, awayId: string | null, homeId: string | null): StatRow[] => {
  const teams = asArray(boxscore?.teams).map(asObject).filter((team): team is JsonObject => team !== null);
  const byId = (id: string | null): unknown[] => {
    const team = teams.find((entry) => asString(nested(entry, 'team', 'id')) === id);
    return asArray(team?.statistics);
  };

  const awayStats = byId(awayId);
  const homeStats = byId(homeId);
  const definitions: ReadonlyArray<readonly [string, string]> = [
    ['Possession', 'possessionTime'],
    ['Total yards', 'totalYards'],
    ['Yards per play', 'yardsPerPlay'],
    ['First downs', 'firstDowns'],
    ['Rushing', 'rushingAttempts-Yards'],
    ['Passing', 'completionAttempts'],
    ['Turnovers', 'turnovers'],
    ['Penalties', 'totalPenaltiesYards'],
    ['Sacks', 'sacksYardsLost'],
    ['Third-down efficiency', 'thirdDownEff'],
  ];

  return definitions.map(([label, name]) => ({
    label,
    away: statValue(awayStats, name),
    home: statValue(homeStats, name),
  }));
};

const leaderText = (leaders: unknown[], name: string): string | null => {
  const category = leaders.map(asObject).find((leader) => asString(leader?.name) === name);
  const first = asObject(asArray(category?.leaders)[0]);
  const athlete = asObject(first?.athlete);
  const displayName = asString(athlete?.displayName);
  const displayValue = asString(first?.displayValue);
  if (!displayName) return null;
  return displayValue ? `${displayName} — ${displayValue}` : displayName;
};

const mapLeaders = (boxscore: JsonObject | null, awayId: string | null, homeId: string | null): LeaderRow[] => {
  const players = asArray(boxscore?.players).map(asObject).filter((entry): entry is JsonObject => entry !== null);
  const leadersByTeam = (id: string | null): unknown[] => {
    const team = players.find((entry) => asString(nested(entry, 'team', 'id')) === id);
    return asArray(team?.statistics).flatMap((category) => {
      const object = asObject(category);
      if (!object) return [];
      const athletes = asArray(object.athletes);
      const first = asObject(athletes[0]);
      const athlete = asObject(first?.athlete);
      const stats = asArray(first?.stats);
      const labels = asArray(object.labels).map(asString);
      const displayValue = stats.length > 0
        ? stats.map((stat, index) => `${labels[index] ?? ''}: ${String(stat)}`).join(', ')
        : null;
      return [{
        name: asString(object.name),
        leaders: [{ athlete, displayValue }],
      }];
    });
  };

  const awayLeaders = leadersByTeam(awayId);
  const homeLeaders = leadersByTeam(homeId);
  return [
    { category: 'Passing', away: leaderText(awayLeaders, 'passing'), home: leaderText(homeLeaders, 'passing') },
    { category: 'Rushing', away: leaderText(awayLeaders, 'rushing'), home: leaderText(homeLeaders, 'rushing') },
    { category: 'Receiving', away: leaderText(awayLeaders, 'receiving'), home: leaderText(homeLeaders, 'receiving') },
  ];
};

const mapPlay = (value: unknown): PlayRow | null => {
  const play = asObject(value);
  const text = asString(play?.text);
  if (!play || !text) return null;
  return {
    period: asNumber(nested(play, 'period', 'number')),
    clock: asString(nested(play, 'clock', 'displayValue')),
    text,
    awayScore: asNumber(play.awayScore),
    homeScore: asNumber(play.homeScore),
  };
};

const deriveLineScoresFromScoringPlays = (
  scoringPlays: readonly PlayRow[],
  awayTotal: number | null,
  homeTotal: number | null
): { away: number[]; home: number[] } => {
  const away: number[] = [];
  const home: number[] = [];
  let previousAway = 0;
  let previousHome = 0;

  for (const play of scoringPlays) {
    if (play.period === null || play.period <= 0) continue;
    if (play.awayScore === null || play.homeScore === null) continue;

    const periodIndex = play.period - 1;
    while (away.length <= periodIndex) away.push(0);
    while (home.length <= periodIndex) home.push(0);

    away[periodIndex] += Math.max(0, play.awayScore - previousAway);
    home[periodIndex] += Math.max(0, play.homeScore - previousHome);
    previousAway = play.awayScore;
    previousHome = play.homeScore;
  }

  const minimumPeriods = 4;
  while (away.length < minimumPeriods) away.push(0);
  while (home.length < minimumPeriods) home.push(0);

  if (awayTotal !== null) {
    const difference = awayTotal - away.reduce((sum, value) => sum + value, 0);
    if (difference > 0) away[away.length - 1] += difference;
  }
  if (homeTotal !== null) {
    const difference = homeTotal - home.reduce((sum, value) => sum + value, 0);
    if (difference > 0) home[home.length - 1] += difference;
  }

  return { away, home };
};

export const playoffGameDetailsRouter = Router();

playoffGameDetailsRouter.get('/:gameId/details', async (req, res) => {
  try {
    const requestedId = req.params.gameId.trim();
    const numericId = Number(requestedId);
    if (!requestedId || !Number.isInteger(numericId) || numericId <= 0) {
      return res.status(400).json({ success: false, message: 'gameId must be a positive integer' });
    }

    // Playoff-bracket rows pass the DPA Game.id. Upcoming Schedule rows pass
    // ESPN's event id. Support both identifiers through this shared endpoint.
    const gameByDatabaseId = await prisma.game.findUnique({
      where: { id: numericId },
      select: {
        id: true,
        seasonYear: true,
        gameWeek: true,
        gameDate: true,
        gameLocation: true,
        gameCity: true,
        gameStateProvince: true,
        gameStatus: true,
        playoffRound: true,
        playoffConference: true,
        isPlayoff: true,
        seasonType: true,
        espnEventId: true,
        homeScore: true,
        awayScore: true,
        homeTeam: {
          select: {
            id: true,
            name: true,
            city: true,
            abbreviation: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
            city: true,
            abbreviation: true,
          },
        },
      },
    });

    const gameByEspnEventId = gameByDatabaseId
      ? null
      : await prisma.game.findFirst({
          where: { espnEventId: requestedId },
          select: {
            id: true,
            seasonYear: true,
            gameWeek: true,
            gameDate: true,
            gameLocation: true,
            gameCity: true,
            gameStateProvince: true,
            gameStatus: true,
            playoffRound: true,
            playoffConference: true,
            isPlayoff: true,
            seasonType: true,
            espnEventId: true,
            homeScore: true,
            awayScore: true,
            homeTeam: {
              select: {
                id: true,
                name: true,
                city: true,
                abbreviation: true,
              },
            },
            awayTeam: {
              select: {
                id: true,
                name: true,
                city: true,
                abbreviation: true,
              },
            },
          },
        });

    const game = gameByDatabaseId ?? gameByEspnEventId;

    const localTeamSummary = (
      team: { id: number; name: string; city: string | null; abbreviation: string | null },
      score: number | null,
      opponentScore: number | null
    ): TeamSummary => ({
      id: String(team.id),
      abbreviation: team.abbreviation?.trim() || team.name.slice(0, 3).toUpperCase(),
      displayName: team.name,
      logoUrl: null,
      score,
      winner: score !== null && opponentScore !== null && score > opponentScore,
      record: null,
      linescores: [],
    });

    const localResponse = () => {
      if (!game) {
        return res.status(404).json({ success: false, message: `Game ${requestedId} was not found` });
      }

      const seasonYear = Number(game.seasonYear);
      const awayTeam = localTeamSummary(game.awayTeam, game.awayScore, game.homeScore);
      const homeTeam = localTeamSummary(game.homeTeam, game.homeScore, game.awayScore);
      return res.json({
        success: true,
        data: {
          gameId: game.id,
          espnEventId: game.espnEventId ?? '',
          seasonYear,
          title: game.playoffRound
            ? resolvePlayoffTitle(game.playoffRound, game.playoffConference, seasonYear)
            : `${awayTeam.displayName} at ${homeTeam.displayName}`,
          playoffRound: game.playoffRound ?? null,
          playoffConference: game.playoffConference ?? null,
          playoffGameName: null,
          date: game.gameDate?.toISOString() ?? null,
          venue: game.gameLocation ?? null,
          location: [game.gameCity, game.gameStateProvince].filter(Boolean).join(', ') || null,
          status: String(game.gameStatus),
          awayTeam,
          homeTeam,
          teamStats: [],
          leaders: [],
          scoringPlays: [],
          recentPlays: [],
        },
      });
    };

    // A caller can supply either our local Game.id or ESPN's event id. Upcoming
    // Schedule is live-provider-backed, so an ESPN event may legitimately have no
    // local Game row yet. In that case, use the requested id directly with ESPN.
    if (game && !game.espnEventId) {
      return localResponse();
    }

    const espnEventId = game?.espnEventId?.trim() || requestedId;

    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${encodeURIComponent(espnEventId)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) {
      if (game) {
        console.warn(`[game-details] ESPN summary unavailable for event ${espnEventId} (${response.status}); using local game data`);
        return localResponse();
      }

      const status = response.status === 404 ? 404 : 502;
      return res.status(status).json({
        success: false,
        message: response.status === 404
          ? `Game ${requestedId} was not found`
          : `ESPN summary unavailable for event ${espnEventId}`,
      });
    }

    const payload: unknown = await response.json();
    const header = asObject(asArray(nested(payload, 'header', 'competitions'))[0]);
    const competitors = asArray(header?.competitors);
    const away = competitors.map(asObject).find((entry) => asString(entry?.homeAway) === 'away');
    const home = competitors.map(asObject).find((entry) => asString(entry?.homeAway) === 'home');
    const awayTeam = mapCompetitor(away);
    const homeTeam = mapCompetitor(home);

    if (!awayTeam || !homeTeam) {
      return res.status(502).json({ success: false, message: 'ESPN summary did not contain both competitors' });
    }

    const boxscore = asObject(nested(payload, 'boxscore'));
    const scoringPlays = asArray(nested(payload, 'scoringPlays')).map(mapPlay).filter((play): play is PlayRow => play !== null);
    const derivedLineScores = deriveLineScoresFromScoringPlays(
      scoringPlays,
      awayTeam.score,
      homeTeam.score
    );
    const normalizedAwayTeam: TeamSummary = {
      ...awayTeam,
      linescores: awayTeam.linescores.length > 0 ? awayTeam.linescores : derivedLineScores.away,
    };
    const normalizedHomeTeam: TeamSummary = {
      ...homeTeam,
      linescores: homeTeam.linescores.length > 0 ? homeTeam.linescores : derivedLineScores.home,
    };
    const allPlays = asArray(nested(payload, 'plays')).map(mapPlay).filter((play): play is PlayRow => play !== null);
    const recentPlays = allPlays.slice(-10).reverse();
    const status = asString(nested(header, 'status', 'type', 'detail'))
      ?? asString(nested(header, 'status', 'type', 'description'))
      ?? (game ? String(game.gameStatus) : 'Scheduled');

    const seasonYear = Number(game?.seasonYear ?? nested(payload, 'header', 'season', 'year') ?? 0);
    const eventDate = game?.gameDate?.toISOString()
      ?? asString(header?.date)
      ?? asString(nested(payload, 'header', 'competitions', '0', 'date'));
    const venueName = game?.gameLocation
      ?? asString(nested(payload, 'gameInfo', 'venue', 'fullName'))
      ?? asString(nested(header, 'venue', 'fullName'));
    const city = game?.gameCity
      ?? asString(nested(payload, 'gameInfo', 'venue', 'address', 'city'));
    const state = game?.gameStateProvince
      ?? asString(nested(payload, 'gameInfo', 'venue', 'address', 'state'));

    return res.json({
      success: true,
      data: {
        gameId: game?.id ?? numericId,
        espnEventId,
        seasonYear,
        title: game?.playoffRound
          ? resolvePlayoffTitle(game.playoffRound, game.playoffConference, seasonYear)
          : `${normalizedAwayTeam.displayName} at ${normalizedHomeTeam.displayName}`,
        playoffRound: game?.playoffRound ?? null,
        playoffConference: game?.playoffConference ?? null,
        playoffGameName: null,
        date: eventDate,
        venue: venueName,
        location: [city, state].filter(Boolean).join(', ') || null,
        status,
        awayTeam: normalizedAwayTeam,
        homeTeam: normalizedHomeTeam,
        teamStats: mapStats(boxscore, normalizedAwayTeam.id, normalizedHomeTeam.id),
        leaders: mapLeaders(boxscore, normalizedAwayTeam.id, normalizedHomeTeam.id),
        scoringPlays,
        recentPlays,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load game details';
    console.error('[game-details]', error);
    return res.status(500).json({ success: false, message });
  }
});
