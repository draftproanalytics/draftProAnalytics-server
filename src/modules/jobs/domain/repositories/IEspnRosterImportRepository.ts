import type {
  EspnRosterAthleteDto,
  EspnRosterImportMode,
  EspnRosterImportTeamDto,
  UpsertTeamRosterAthleteResult,
} from '../dtos/EspnRosterImport.dto';

export interface IEspnRosterImportRepository {
  listImportTeams(teamId?: number): Promise<readonly EspnRosterImportTeamDto[]>;
  upsertCurrentRosterAthlete(
    team: EspnRosterImportTeamDto,
    athlete: EspnRosterAthleteDto,
    seasonYear: number,
    importMode: EspnRosterImportMode,
  ): Promise<UpsertTeamRosterAthleteResult>;
  deactivateMissingCurrentMemberships(
    teamId: number,
    importedPlayerIds: readonly number[],
    seasonYear: number,
  ): Promise<number>;
}
