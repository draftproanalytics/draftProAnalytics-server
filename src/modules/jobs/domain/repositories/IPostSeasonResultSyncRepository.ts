import type { SyncPostSeasonResultsResultDto } from '../dtos/PostSeasonResultSync.dto';

export interface IPostSeasonResultSyncRepository {
  syncFromGames(seasonYear: number, overwriteExisting: boolean): Promise<SyncPostSeasonResultsResultDto>;
}
