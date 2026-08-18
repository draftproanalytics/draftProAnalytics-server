import type { NflGameEventDto, NflTeamIdentityDto } from '../../domain/dtos/NflGameEvent.dto';
import type {
  FetchNflWeekEventsQuery,
  INflScheduleProvider,
} from '../../domain/services/INflScheduleProvider';
import { normalizeNflWeekForPersistence } from '../../domain/value-objects/NflSeasonType';

interface EspnScoreboardResponse {
  readonly events?: readonly EspnEvent[];
}

interface EspnEvent {
  readonly id?: string;
  readonly date?: string;
  readonly competitions?: readonly EspnCompetition[];
  readonly status?: {
    readonly type?: {
      readonly name?: string;
      readonly state?: string;
      readonly completed?: boolean;
    };
  };
  readonly week?: {
    readonly number?: number;
  };
}

interface EspnCompetition {
  readonly id?: string;
  readonly competitors?: readonly EspnCompetitor[];
  readonly venue?: {
    readonly fullName?: string;
    readonly address?: {
      readonly city?: string;
      readonly state?: string;
      readonly country?: string;
    };
  };
}

interface EspnCompetitor {
  readonly homeAway?: 'home' | 'away';
  readonly score?: string;
  readonly team?: {
    readonly id?: string;
    readonly abbreviation?: string;
    readonly displayName?: string;
    readonly shortDisplayName?: string;
    readonly name?: string;
    readonly location?: string;
  };
}

const readTeamIdentity = (competitor: EspnCompetitor): NflTeamIdentityDto => {
  const team = competitor.team;

  if (!team?.id || !team.abbreviation || !team.displayName) {
    throw new Error('ESPN event is missing team identity fields.');
  }

  return {
    espnTeamId: team.id,
    abbreviation: team.abbreviation,
    displayName: team.displayName,
    shortName: team.shortDisplayName ?? team.name ?? team.abbreviation,
    name: team.name ?? team.location ?? team.displayName,
  };
};

const parseScore = (score: string | undefined): number | null => {
  if (score === undefined || score.trim() === '') {
    return null;
  }

  const parsedScore = Number.parseInt(score, 10);
  return Number.isNaN(parsedScore) ? null : parsedScore;
};

const mapStatus = (event: EspnEvent): NflGameEventDto['status'] => {
  if (event.status?.type?.completed === true) {
    return 'final';
  }

  const state = event.status?.type?.state?.toLowerCase();

  if (state === 'in') {
    return 'in_progress';
  }

  return 'scheduled';
};

const buildScoreboardUrl = (query: FetchNflWeekEventsQuery): string => {
  const url = new URL('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
  url.searchParams.set('dates', String(query.seasonYear));
  url.searchParams.set('seasontype', String(query.seasonType));
  url.searchParams.set('week', String(query.week));
  url.searchParams.set('limit', '1000');
  return url.toString();
};

export class EspnNflScheduleProvider implements INflScheduleProvider {
  public async fetchWeekEvents(query: FetchNflWeekEventsQuery): Promise<readonly NflGameEventDto[]> {
    const url = buildScoreboardUrl(query);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ESPN NFL scoreboard request failed: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as EspnScoreboardResponse;

    return (body.events ?? []).map((event) => this.mapEvent(event, query));
  }

  private mapEvent(event: EspnEvent, query: FetchNflWeekEventsQuery): NflGameEventDto {
    const competition = event.competitions?.[0];

    if (!event.id || !competition?.id) {
      throw new Error('ESPN event is missing event or competition id.');
    }

    const homeCompetitor = competition.competitors?.find((competitor) => competitor.homeAway === 'home');
    const awayCompetitor = competition.competitors?.find((competitor) => competitor.homeAway === 'away');

    if (!homeCompetitor || !awayCompetitor) {
      throw new Error(`ESPN event ${event.id} is missing home or away competitor.`);
    }

    const eventDate = event.date ? new Date(event.date) : null;

    return {
      espnEventId: event.id,
      espnCompetitionId: competition.id,
      seasonYear: query.seasonYear,
      seasonType: query.seasonType,
      week: normalizeNflWeekForPersistence(query.seasonType, event.week?.number ?? query.week),
      gameDate: eventDate && Number.isNaN(eventDate.getTime()) ? null : eventDate,
      status: mapStatus(event),
      isPlayoff: query.seasonType === 3,
      venueName: competition.venue?.fullName ?? null,
      city: competition.venue?.address?.city ?? null,
      stateProvince: competition.venue?.address?.state ?? null,
      country: competition.venue?.address?.country ?? 'USA',
      homeTeam: readTeamIdentity(homeCompetitor),
      awayTeam: readTeamIdentity(awayCompetitor),
      homeScore: parseScore(homeCompetitor.score),
      awayScore: parseScore(awayCompetitor.score),
    };
  }
}
