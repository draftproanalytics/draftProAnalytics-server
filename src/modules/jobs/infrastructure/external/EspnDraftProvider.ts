import type { EspnDraftAthleteDto, EspnDraftSelectionDto } from '../../domain/dtos/EspnDraftImport.dto';
import type { IEspnDraftProvider } from '../../domain/services/IEspnDraftProvider';

interface RefValue { readonly $ref?: string; }
interface Collection<T> { readonly items?: readonly T[]; }
interface DraftRound {
  readonly number?: number;
  readonly picks?: readonly DraftPick[];
}
interface DraftPick {
  readonly id?: string | number;
  readonly number?: number;
  readonly overall?: number;
  readonly overallPick?: number;
  readonly pick?: number;
  readonly status?: { readonly name?: string };
  readonly team?: RefValue & { readonly id?: string | number };
  readonly originalTeam?: RefValue & { readonly id?: string | number };
  readonly athlete?: RefValue & AthleteBody;
  readonly player?: RefValue & AthleteBody;
  readonly position?: RefValue & { readonly abbreviation?: string };
  readonly college?: RefValue & { readonly name?: string };
  readonly compensatory?: boolean;
  readonly isCompensatory?: boolean;
}
interface AthleteBody extends RefValue {
  readonly id?: string | number;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly fullName?: string;
  readonly displayName?: string;
  readonly shortName?: string;
  readonly jersey?: string | number;
  readonly height?: number;
  readonly weight?: number;
  readonly age?: number;
  readonly dateOfBirth?: string;
  readonly birthDate?: string;
  readonly position?: RefValue & { readonly abbreviation?: string; readonly name?: string };
  readonly team?: RefValue & { readonly id?: string | number };
  readonly college?: RefValue & { readonly name?: string } | string;
  readonly experience?: number | { readonly years?: number };
  readonly status?: { readonly type?: string; readonly name?: string } | string;
  readonly athlete?: RefValue & AthleteBody;
}

const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const idFromRef = (value: RefValue | undefined, segment: string): string | null => {
  const ref = value?.$ref;
  if (!ref) return null;
  const match = ref.match(new RegExp(`/${segment}/([^/?]+)`));
  return match?.[1] ?? null;
};
const numberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};
const stringOrNull = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
};

export class EspnDraftProvider implements IEspnDraftProvider {
  public async fetchDraftClassAthletes(draftYear: number): Promise<readonly EspnDraftAthleteDto[]> {
    const collection = await this.getJson<Collection<RefValue>>(
      `${CORE}/seasons/${draftYear}/draft/athletes?limit=1000`,
    );
    const athletes: EspnDraftAthleteDto[] = [];
    for (const item of collection.items ?? []) {
      if (!item.$ref) continue;
      const body = await this.getJson<AthleteBody>(item.$ref);
      const mapped = await this.mapAthlete(body, draftYear);
      if (mapped) athletes.push(mapped);
    }
    return athletes;
  }

  public async fetchDraftSelections(draftYear: number): Promise<readonly EspnDraftSelectionDto[]> {
    const collection = await this.getJson<Collection<DraftRound>>(
      `${CORE}/seasons/${draftYear}/draft/rounds?limit=10`,
    );
    const selections: EspnDraftSelectionDto[] = [];
    let fallbackOverall = 0;
    for (const round of collection.items ?? []) {
      const roundNumber = numberOrNull(round.number) ?? 0;
      let pickInRound = 0;
      for (const pick of round.picks ?? []) {
        pickInRound += 1;
        fallbackOverall += 1;
        const teamEspnId = stringOrNull(pick.team?.id) ?? idFromRef(pick.team, 'teams');
        if (!teamEspnId) continue;
        const rawAthlete = pick.athlete ?? pick.player ?? null;
        const athlete = rawAthlete ? await this.resolveDraftAthlete(rawAthlete, draftYear) : null;
        const overallPick = numberOrNull(pick.overallPick ?? pick.overall ?? pick.pick ?? pick.number) ?? fallbackOverall;
        const statusName = pick.status?.name?.toUpperCase() ?? '';
        const position = athlete?.position ?? pick.position?.abbreviation ?? 'WR';
        const college = athlete?.college ?? pick.college?.name ?? null;
        selections.push({
          espnDraftPickId: String(pick.id ?? `${draftYear}-${overallPick}`),
          draftYear,
          round: roundNumber,
          pickInRound,
          overallPick,
          teamEspnId,
          originalTeamEspnId: stringOrNull(pick.originalTeam?.id) ?? idFromRef(pick.originalTeam, 'teams'),
          athleteEspnId: athlete?.espnAthleteId ?? null,
          playerName: athlete?.displayName ?? `Unresolved player ${overallPick}`,
          position,
          college,
          isCompensatory: pick.isCompensatory === true || pick.compensatory === true,
          isForfeited: statusName.includes('FORFEIT'),
          athlete,
        });
      }
    }
    return selections;
  }

  private async resolveDraftAthlete(input: AthleteBody, draftYear: number): Promise<EspnDraftAthleteDto | null> {
    // Draft picks commonly reference a draft-athlete wrapper. The wrapper ID is
    // not Player.espnAthleteId; fetch it and follow its nested athlete reference.
    if (input.$ref) {
      try {
        const wrapper = await this.getJson<AthleteBody>(input.$ref);
        const mapped = await this.mapAthlete(wrapper, draftYear);
        if (mapped) return mapped;
      } catch {
        return null;
      }
    }
    return this.mapAthlete(input, draftYear);
  }

  public async fetchAthlete(espnAthleteId: string, draftYear: number): Promise<EspnDraftAthleteDto | null> {
    const urls = [
      `${CORE}/seasons/${draftYear}/athletes/${espnAthleteId}`,
      `${CORE}/athletes/${espnAthleteId}`,
    ];
    for (const url of urls) {
      try { return await this.mapAthlete(await this.getJson<AthleteBody>(url), draftYear); }
      catch { /* try fallback */ }
    }
    return null;
  }

  private async mapAthlete(input: AthleteBody, draftYear: number): Promise<EspnDraftAthleteDto | null> {
    const nested = input.athlete?.$ref ? await this.getJson<AthleteBody>(input.athlete.$ref) : input.athlete;
    const body = nested ?? input;
    const id = stringOrNull(body.id) ?? idFromRef(body, 'athletes');
    if (!id) return null;
    const firstName = body.firstName?.trim() ?? '';
    const lastName = body.lastName?.trim() ?? '';
    if (!firstName || !lastName) return null;
    const displayName = body.displayName ?? body.fullName ?? (`${firstName} ${lastName}`.trim() || id);
    const positionResource = body.position?.$ref && !body.position.abbreviation
      ? await this.getJson<{ readonly abbreviation?: string; readonly name?: string }>(body.position.$ref)
      : body.position;
    const collegeResource = typeof body.college !== 'string' && body.college?.$ref && !body.college.name
      ? await this.getJson<{ readonly name?: string }>(body.college.$ref)
      : body.college;
    const college = typeof collegeResource === 'string' ? collegeResource : collegeResource?.name ?? null;
    const dateValue = body.dateOfBirth ?? body.birthDate;
    const dateOfBirth = dateValue ? new Date(dateValue) : null;
    const experience = typeof body.experience === 'number' ? body.experience : body.experience?.years ?? null;
    const status = typeof body.status === 'string' ? body.status : body.status?.type ?? body.status?.name ?? null;
    const teamId = stringOrNull(body.team?.id) ?? idFromRef(body.team, 'teams');
    return {
      espnAthleteId: id,
      firstName,
      lastName,
      displayName,
      shortName: body.shortName ?? displayName,
      position: positionResource?.abbreviation ?? positionResource?.name ?? 'WR',
      jerseyNumber: numberOrNull(body.jersey),
      teamEspnId: teamId,
      height: numberOrNull(body.height),
      weight: numberOrNull(body.weight),
      age: numberOrNull(body.age),
      dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
      college,
      experience,
      status,
    };
  }

  private async getJson<T>(rawUrl: string): Promise<T> {
    const url = rawUrl.replace(/^http:/, 'https:');
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`ESPN draft request failed: ${response.status} ${response.statusText} (${url})`);
    return (await response.json()) as T;
  }
}
