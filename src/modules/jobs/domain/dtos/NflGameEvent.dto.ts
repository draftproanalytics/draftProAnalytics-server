import type { NflSeasonType } from '../value-objects/NflSeasonType';

export interface NflTeamIdentityDto {
  readonly espnTeamId: string;
  readonly abbreviation: string;
  readonly displayName: string;
  readonly shortName: string;
  readonly name: string;
}

export interface NflGameEventDto {
  readonly espnEventId: string;
  readonly espnCompetitionId: string;
  readonly seasonYear: number;
  readonly seasonType: NflSeasonType;
  readonly week: number;
  readonly gameDate: Date | null;
  readonly status: 'scheduled' | 'in_progress' | 'final';
  readonly isPlayoff: boolean;
  readonly venueName: string | null;
  readonly city: string | null;
  readonly stateProvince: string | null;
  readonly country: string;
  readonly homeTeam: NflTeamIdentityDto;
  readonly awayTeam: NflTeamIdentityDto;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}
