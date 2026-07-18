import type { EspnRosterAthleteDto } from '../dtos/EspnRosterImport.dto';

export interface IEspnRosterProvider {
  fetchTeamRoster(espnTeamId: number, seasonYear: number): Promise<readonly EspnRosterAthleteDto[]>;
}
