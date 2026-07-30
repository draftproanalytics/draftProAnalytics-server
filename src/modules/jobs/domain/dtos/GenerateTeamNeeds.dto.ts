export interface GenerateTeamNeedsPayloadDto {
  readonly draftYear: number;
  readonly asOfDate: string;
  readonly teamId?: number;
  readonly replaceRecommendations: boolean;
  readonly algorithmVersion: string;
  readonly requestedByPersonId?: number;
}

export interface GenerateTeamNeedsResultDto {
  readonly draftYear: number;
  readonly teamsRequested: number;
  readonly teamsProcessed: number;
  readonly teamsSkipped: number;
  readonly recommendationsCreated: number;
  readonly recommendationsUpdated: number;
  readonly protectedRowsPreserved: number;
  readonly recommendationsRemoved: number;
  readonly warnings: readonly {
    readonly teamId: number;
    readonly code: string;
    readonly message: string;
  }[];
}
