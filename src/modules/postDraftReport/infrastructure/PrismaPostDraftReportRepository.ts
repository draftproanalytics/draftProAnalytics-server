import { createHash } from 'crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { DraftPickInput, EvaluationModelSnapshot, PostDraftInputSnapshot, TeamDraftReport } from '../domain/PostDraftReport.types';

const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
};

export class PrismaPostDraftReportRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getActiveModel(): Promise<EvaluationModelSnapshot> {
    const model = await this.prisma.postDraftEvaluationModel.findFirst({
      where: { modelKey: 'DPA_POST_DRAFT_REPORT', positionGroup: 'ALL', isActive: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }]
    });
    if (!model) throw Object.assign(new Error('No active DPA post-draft evaluation model is configured.'), { statusCode: 409 });
    return {
      id: model.id.toString(), modelKey: model.modelKey, modelVersion: model.modelVersion,
      positionGroup: model.positionGroup,
      weights: model.weightsJson as Record<string, number>, thresholds: model.thresholdsJson as Record<string, number>
    };
  }

  public createSnapshot(teamId: number, draftYear: number, model: EvaluationModelSnapshot, picks: DraftPickInput[]): PostDraftInputSnapshot {
    return { teamId, draftYear, capturedAt: new Date().toISOString(), model, picks };
  }

  public hashSnapshot(snapshot: PostDraftInputSnapshot): string {
    const stable = { ...snapshot, capturedAt: undefined };
    return createHash('sha256').update(canonicalJson(stable)).digest('hex');
  }

  public async finalize(snapshot: PostDraftInputSnapshot, report: TeamDraftReport): Promise<TeamDraftReport> {
    const modelId = BigInt(snapshot.model.id);
    const inputHash = this.hashSnapshot(snapshot);
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.postDraftReport.findFirst({
        where: { teamId: snapshot.teamId, draftYear: snapshot.draftYear },
        orderBy: { reportVersion: 'desc' }, select: { reportVersion: true }
      });
      const reportVersion = (latest?.reportVersion ?? 0) + 1;
      const created = await tx.postDraftReport.create({
        data: {
          teamId: snapshot.teamId, draftYear: snapshot.draftYear, reportVersion,
          status: 'FINALIZED', modelId, modelKey: snapshot.model.modelKey,
          modelVersion: snapshot.model.modelVersion, overallScore: report.overallScore,
          overallGrade: report.overallGrade, dataConfidence: report.dataConfidence,
          inputHash, inputSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
          reportJson: report as unknown as Prisma.InputJsonValue,
          pickEvaluations: { create: report.rounds.flatMap((round) => round.picks.map((pick) => ({
            draftPickId: pick.draftPickId, roundNumber: pick.round, pickNumber: pick.pickNumber,
            prospectId: pick.prospectId, playerName: pick.playerName, position: pick.position,
            overallScore: pick.overallScore, letterGrade: pick.letterGrade,
            dataConfidence: pick.dataConfidence,
            scoreBreakdownJson: pick.scoreBreakdown as unknown as Prisma.InputJsonValue,
            ...(pick.wrEvaluation === null ? {} : { wrEvaluationJson: pick.wrEvaluation as unknown as Prisma.InputJsonValue }),
            missingSignalsJson: pick.missingSignals as unknown as Prisma.InputJsonValue,
            summary: pick.summary
          }))) },
          roundEvaluations: { create: report.rounds.map((round) => ({
            roundNumber: round.round, score: round.score, letterGrade: round.letterGrade, summary: round.summary
          })) }
        }
      });
      return {
        ...report, reportId: created.id.toString(), reportVersion, status: 'FINALIZED',
        finalizedAt: created.finalizedAt.toISOString(), inputHash
      };
    });
  }

  public async getLatest(teamId: number, draftYear: number): Promise<TeamDraftReport | null> {
    const row = await this.prisma.postDraftReport.findFirst({
      where: { teamId, draftYear }, orderBy: { reportVersion: 'desc' }
    });
    if (!row) return null;
    const report = row.reportJson as unknown as TeamDraftReport;
    return { ...report, reportId: row.id.toString(), reportVersion: row.reportVersion, status: 'FINALIZED', finalizedAt: row.finalizedAt.toISOString(), inputHash: row.inputHash };
  }

  public async history(teamId: number, draftYear: number): Promise<Array<Record<string, unknown>>> {
    const rows = await this.prisma.postDraftReport.findMany({
      where: { teamId, draftYear }, orderBy: { reportVersion: 'desc' },
      select: { id: true, reportVersion: true, modelKey: true, modelVersion: true, overallScore: true, overallGrade: true, dataConfidence: true, inputHash: true, finalizedAt: true }
    });
    return rows.map((row) => ({ ...row, id: row.id.toString(), overallScore: Number(row.overallScore), dataConfidence: Number(row.dataConfidence) }));
  }
}
