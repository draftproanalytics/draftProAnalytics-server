import type { IPostDraftDataProvider } from '../domain/IPostDraftDataProvider';
import type { TeamDraftReport } from '../domain/PostDraftReport.types';
import { PostDraftScoringService } from './PostDraftScoringService';

export class GenerateTeamPostDraftReportUseCase {
  public constructor(
    private readonly dataProvider: IPostDraftDataProvider,
    private readonly scoringService: PostDraftScoringService
  ) {}

  public async execute(teamId: number, draftYear: number): Promise<TeamDraftReport> {
    const picks = await this.dataProvider.getTeamDraftPicks(teamId, draftYear);
    if (picks.length === 0) {
      throw Object.assign(new Error(`No completed draft picks found for team ${teamId} in ${draftYear}.`), { statusCode: 404 });
    }
    return this.scoringService.generate(teamId, picks[0].teamName, draftYear, picks);
  }
}
