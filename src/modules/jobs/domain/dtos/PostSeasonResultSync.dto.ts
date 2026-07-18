export interface SyncPostSeasonResultsPayloadDto {
  readonly seasonYear: number;
  readonly overwriteExisting: boolean;
  readonly requestedByPersonId?: number;
}

export interface SyncPostSeasonResultsResultDto {
  readonly seasonYear: number;
  readonly completedPostseasonGames: number;
  readonly teamsProcessed: number;
  readonly resultsCreated: number;
  readonly resultsUpdated: number;
  readonly resultsSkipped: number;
}
