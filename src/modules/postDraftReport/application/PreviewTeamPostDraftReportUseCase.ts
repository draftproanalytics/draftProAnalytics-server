import type { IPostDraftDataProvider } from '../domain/IPostDraftDataProvider';
import type { PostDraftInputSnapshot, TeamDraftReport } from '../domain/PostDraftReport.types';
import { PrismaPostDraftReportRepository } from '../infrastructure/PrismaPostDraftReportRepository';
import { PostDraftScoringService } from './PostDraftScoringService';

export class PreviewTeamPostDraftReportUseCase {
  public constructor(
    private readonly provider: IPostDraftDataProvider,
    private readonly repository: PrismaPostDraftReportRepository,
    private readonly scoring: PostDraftScoringService
  ) {}

  public async execute(teamId: number, draftYear: number): Promise<{ report: TeamDraftReport; snapshot: PostDraftInputSnapshot }> {
    const picks = await this.provider.getTeamDraftPicks(teamId, draftYear);
    if (!picks.length) throw Object.assign(new Error(`No completed draft picks found for team ${teamId} in ${draftYear}.`), { statusCode: 404 });
    const model = await this.repository.getActiveModel();
    const snapshot = this.repository.createSnapshot(teamId, draftYear, model, picks);
    const report = this.scoring.generate(teamId, picks[0].teamName, draftYear, picks);
    return { report: { ...report, modelKey: model.modelKey, modelVersion: model.modelVersion, status: 'PREVIEW' }, snapshot };
  }
}
