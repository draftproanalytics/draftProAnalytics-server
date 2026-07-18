export interface EspnDraftYearPayloadDto {
  readonly draftYear: number;
  readonly requestedByPersonId?: number;
}

export interface EspnDraftResultsPayloadDto extends EspnDraftYearPayloadDto {
  readonly activateMembership: boolean;
}

export interface EnrichPlayerTeamPositionsPayloadDto extends EspnDraftYearPayloadDto {
  readonly overwriteExisting: boolean;
}

export interface SyncEspnDraftPicksToDpaPayloadDto extends EspnDraftYearPayloadDto {
  readonly overwriteExisting: boolean;
}

export interface EspnDraftAthleteDto {
  readonly espnAthleteId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly displayName: string;
  readonly shortName: string;
  readonly position: string;
  readonly jerseyNumber: number | null;
  readonly teamEspnId: string | null;
  readonly height: number | null;
  readonly weight: number | null;
  readonly age: number | null;
  readonly dateOfBirth: Date | null;
  readonly college: string | null;
  readonly experience: number | null;
  readonly status: string | null;
}

export interface EspnDraftSelectionDto {
  readonly espnDraftPickId: string;
  readonly draftYear: number;
  readonly round: number;
  readonly pickInRound: number;
  readonly overallPick: number;
  readonly teamEspnId: string;
  readonly originalTeamEspnId: string | null;
  readonly athleteEspnId: string | null;
  readonly playerName: string;
  readonly position: string;
  readonly college: string | null;
  readonly isCompensatory: boolean;
  readonly isForfeited: boolean;
  readonly athlete: EspnDraftAthleteDto | null;
}
