import type { EspnRosterAthleteDto } from '../../domain/dtos/EspnRosterImport.dto';
import type { IEspnRosterProvider } from '../../domain/services/IEspnRosterProvider';

interface EspnRosterResponse {
  readonly athletes?: readonly EspnRosterGroup[];
}
interface EspnRosterGroup {
  readonly items?: readonly EspnRosterAthlete[];
}
interface EspnRosterAthlete {
  readonly id?: string | number;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly fullName?: string;
  readonly displayName?: string;
  readonly jersey?: string | number;
  readonly height?: number;
  readonly weight?: number;
  readonly age?: number;
  readonly position?: { readonly abbreviation?: string; readonly name?: string };
  readonly college?: { readonly name?: string };
  readonly experience?: { readonly years?: number } | number;
  readonly status?: { readonly type?: string; readonly name?: string } | string;
}

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

const numberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export class EspnRosterProvider implements IEspnRosterProvider {
  public async fetchTeamRoster(
    espnTeamId: number,
    seasonYear: number,
  ): Promise<readonly EspnRosterAthleteDto[]> {
    const url = `${SITE}/teams/${espnTeamId}/roster?season=${seasonYear}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`ESPN roster request failed: ${response.status} ${response.statusText} (${url})`);
    }

    const body = (await response.json()) as EspnRosterResponse;
    const rows = (body.athletes ?? []).flatMap((group) => group.items ?? []);
    const roster: EspnRosterAthleteDto[] = [];

    for (const athlete of rows) {
      const espnAthleteId = athlete.id === undefined ? '' : String(athlete.id).trim();
      const firstName = athlete.firstName?.trim() ?? '';
      const lastName = athlete.lastName?.trim() ?? '';
      if (!espnAthleteId || !firstName || !lastName) continue;

      const experienceYears = typeof athlete.experience === 'number'
        ? athlete.experience
        : athlete.experience?.years ?? null;
      const status = typeof athlete.status === 'string'
        ? athlete.status
        : athlete.status?.type ?? athlete.status?.name ?? null;

      roster.push({
        espnAthleteId,
        firstName,
        lastName,
        displayName: athlete.displayName ?? athlete.fullName ?? `${firstName} ${lastName}`,
        position: (athlete.position?.abbreviation ?? athlete.position?.name ?? null)?.trim().slice(0, 10) || null,
        jerseyNumber: numberOrNull(athlete.jersey),
        height: numberOrNull(athlete.height),
        weight: numberOrNull(athlete.weight),
        age: numberOrNull(athlete.age),
        college: athlete.college?.name?.trim() || null,
        experienceYears: numberOrNull(experienceYears),
        status,
      });
    }

    if (roster.length === 0) {
      throw new Error(`ESPN returned no roster athletes for team ${espnTeamId}, season ${seasonYear}.`);
    }

    return roster;
  }
}
