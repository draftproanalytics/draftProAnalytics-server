import type { EspnDraftAthleteDto, EspnDraftSelectionDto } from '../dtos/EspnDraftImport.dto';

export interface IEspnDraftProvider {
  fetchDraftClassAthletes(draftYear: number): Promise<readonly EspnDraftAthleteDto[]>;
  fetchDraftSelections(draftYear: number): Promise<readonly EspnDraftSelectionDto[]>;
  fetchAthlete(espnAthleteId: string, draftYear: number): Promise<EspnDraftAthleteDto | null>;
}
