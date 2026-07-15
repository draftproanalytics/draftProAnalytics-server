import type { EspnDraftAthleteDto, EspnDraftSelectionDto } from '../dtos/EspnDraftImport.dto';

export interface UpsertDraftAthleteResult {
  readonly espnPlayerCreated: boolean;
  readonly playerCreated: boolean;
  readonly playerId: number;
}

export interface ImportDraftSelectionResult {
  readonly rawDraftPickCreated: boolean;
  readonly unmatchedPlayer: boolean;
  readonly dpaDraftPickUpdated: boolean;
  readonly membershipCreated: boolean;
  readonly membershipUpdated: boolean;
  readonly unmatchedTeam: boolean;
  readonly activeMembershipConflict: boolean;
}

export interface EnrichPlayerTeamPositionResult {
  readonly membershipFound: boolean;
  readonly positionUpdated: boolean;
  readonly positionSkipped: boolean;
  readonly unmatchedPlayer: boolean;
  readonly unmatchedTeam: boolean;
}

export interface IEspnDraftImportRepository {
  upsertDraftAthlete(athlete: EspnDraftAthleteDto, draftYear: number): Promise<UpsertDraftAthleteResult>;
  importDraftSelection(selection: EspnDraftSelectionDto, activateMembership: boolean): Promise<ImportDraftSelectionResult>;
  enrichPlayerTeamPosition(selection: EspnDraftSelectionDto, overwriteExisting: boolean): Promise<EnrichPlayerTeamPositionResult>;
}
