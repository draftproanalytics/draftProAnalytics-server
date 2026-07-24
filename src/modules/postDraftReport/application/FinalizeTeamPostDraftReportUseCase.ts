import { PreviewTeamPostDraftReportUseCase } from './PreviewTeamPostDraftReportUseCase';
import { PrismaPostDraftReportRepository } from '../infrastructure/PrismaPostDraftReportRepository';
import type { TeamDraftReport } from '../domain/PostDraftReport.types';

export class FinalizeTeamPostDraftReportUseCase {
  public constructor(private readonly preview: PreviewTeamPostDraftReportUseCase, private readonly repository: PrismaPostDraftReportRepository) {}
  public async execute(teamId: number, draftYear: number): Promise<TeamDraftReport> {
    const { report, snapshot } = await this.preview.execute(teamId, draftYear);
    return this.repository.finalize(snapshot, report);
  }
}
