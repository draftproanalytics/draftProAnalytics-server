import type { NflversePlayerProductionRecordDto } from '../dtos/NflversePlayerProduction.dto';
export interface INflversePlayerProductionProvider {
  fetchSeason(seasonYear: number, summaryLevel: 'reg' | 'post' | 'regpost'): Promise<readonly NflversePlayerProductionRecordDto[]>;
}
