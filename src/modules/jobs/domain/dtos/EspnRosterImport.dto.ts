export type EspnRosterImportMode = 'CURRENT' | 'HISTORICAL';

export interface LoadEspnTeamRostersPayloadDto {
  readonly seasonYear: number;
  readonly teamId?: number;
  readonly importMode: EspnRosterImportMode;
  readonly reconcileCurrentRoster: boolean;
  readonly requestedByPersonId?: number;
}

export interface EspnRosterAthleteDto {
  readonly espnAthleteId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string;
  readonly position: string | null;
  readonly jerseyNumber: number | null;
  readonly height: number | null;
  readonly weight: number | null;
  readonly age: number | null;
  readonly college: string | null;
  readonly experienceYears: number | null;
  readonly status: string | null;
}

export interface EspnRosterImportTeamDto {
  readonly teamId: number;
  readonly espnTeamId: number;
  readonly teamName: string;
}

export interface UpsertTeamRosterAthleteResult {
  readonly playerCreated: boolean;
  readonly membershipCreated: boolean;
  readonly membershipUpdated: boolean;
  readonly priorMembershipsDeactivated: number;
  readonly playerId: number;
}
