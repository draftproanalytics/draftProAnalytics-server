import type { DraftPickInput } from './PostDraftReport.types';

export interface IPostDraftDataProvider {
  getTeamDraftPicks(teamId: number, draftYear: number): Promise<DraftPickInput[]>;
}
