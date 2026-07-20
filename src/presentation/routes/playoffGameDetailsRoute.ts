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

export const playoffGameDetailsRouter = Router();

playoffGameDetailsRouter.get('/:gameId/details', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({ success: false, message: 'gameId must be a positive integer' });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
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
      },
    });

    if (!game) {
      return res.status(404).json({ success: false, message: 'Playoff game not found' });
    }
    if (!game.isPlayoff && game.seasonType !== 3) {
      return res.status(400).json({ success: false, message: 'Game is not a playoff game' });
    }
    if (!game.espnEventId) {
      return res.status(409).json({ success: false, message: 'Game does not have an ESPN event id' });
    }

    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${encodeURIComponent(game.espnEventId)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) {
      return res.status(502).json({ success: false, message: `ESPN summary request failed (${response.status})` });
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
    const allPlays = asArray(nested(payload, 'plays')).map(mapPlay).filter((play): play is PlayRow => play !== null);
    const recentPlays = allPlays.slice(-10).reverse();
    const status = asString(nested(payload, 'header', 'competitions', '0', 'status', 'type', 'detail'))
      ?? asString(nested(header, 'status', 'type', 'detail'))
      ?? String(game.gameStatus);

    return res.json({
      success: true,
      data: {
        gameId: game.id,
        espnEventId: game.espnEventId,
        seasonYear: Number(game.seasonYear),
        title: resolvePlayoffTitle(game.playoffRound, game.playoffConference, Number(game.seasonYear)),
        playoffRound: game.playoffRound,
        playoffConference: game.playoffConference,
        playoffGameName: null, 
        date: game.gameDate?.toISOString() ?? null,
        venue: game.gameLocation,
        location: [game.gameCity, game.gameStateProvince].filter(Boolean).join(', ') || null,
        status,
        awayTeam,
        homeTeam,
        teamStats: mapStats(boxscore, awayTeam.id, homeTeam.id),
        leaders: mapLeaders(boxscore, awayTeam.id, homeTeam.id),
        scoringPlays,
        recentPlays,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load playoff game details';
    console.error('[playoff-game-details]', error);
    return res.status(500).json({ success: false, message });
  }
});
