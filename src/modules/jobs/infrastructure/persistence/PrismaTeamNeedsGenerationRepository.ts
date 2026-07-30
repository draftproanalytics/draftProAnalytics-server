import type { Prisma, PrismaClient, rosterPlayers } from '@prisma/client';
import type {
  GeneratedTeamNeedRecord,
  ITeamNeedsGenerationRepository,
  PersistGeneratedTeamNeedsResult,
  TeamNeedsGenerationRosterPlayer,
  TeamNeedsTalentInput,
} from '../../domain/repositories/ITeamNeedsGenerationRepository';

const mapRosterPlayer = (row: rosterPlayers): TeamNeedsGenerationRosterPlayer => ({
  position: row.position,
  positionGroup: row.positionGroup,
  depthChartOrder: row.depthChartOrder,
  age: row.age,
  yearsExperience: row.yearsExperience,
  performanceGrade: Number(row.performanceGrade),
  isStarter: row.isStarter,
  contractYearsRemaining: row.contractYearsRemaining,
  injuryStatus: row.injuryStatus ?? undefined,
});

export class PrismaTeamNeedsGenerationRepository implements ITeamNeedsGenerationRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listTeamIds(teamId?: number): Promise<readonly number[]> {
    if (teamId !== undefined) {
      const team = await this.prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
      return team ? [team.id] : [];
    }

    const teams = await this.prisma.team.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
    return teams.map((team) => team.id);
  }

  public async loadRoster(teamId: number): Promise<readonly TeamNeedsGenerationRosterPlayer[]> {
    const rows = await this.prisma.rosterPlayers.findMany({
      where: { teamId },
      orderBy: [{ positionGroup: 'asc' }, { position: 'asc' }, { depthChartOrder: 'asc' }],
    });
    return rows.map(mapRosterPlayer);
  }


  public async loadTalentInputs(teamId: number, draftYear: number): Promise<readonly TeamNeedsTalentInput[]> {
    const [assessments, contexts] = await Promise.all([
      this.prisma.teamPositionAssessment.findMany({
        where: { teamId, draftYear, status: { in: ['APPROVED', 'RECOMMENDED', 'OVERRIDDEN'] } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.teamPositionContext.findMany({
        where: { teamId, draftYear, status: { in: ['APPROVED', 'RECOMMENDED'] } },
      }),
    ]);
    const contextsByPosition = new Map<string, typeof contexts>();
    for (const context of contexts) {
      const rows = contextsByPosition.get(context.position) ?? [];
      rows.push(context);
      contextsByPosition.set(context.position, rows);
    }
    const positions = new Set([...assessments.map((row) => row.position), ...contexts.map((row) => row.position)]);
    return [...positions].map((position) => {
      const assessment = assessments.find((row) => row.position === position);
      const positionContexts = contextsByPosition.get(position) ?? [];
      const combinedContextRisk = 100 * (1 - positionContexts.reduce((remaining, row) => {
        const weight = Number(row.appliedWeight ?? row.contextScore ?? 0) / 100;
        const confidence = Number(row.analystConfidence ?? 100) / 100;
        return remaining * (1 - Math.max(0, Math.min(1, weight * confidence)));
      }, 1));
      return {
        position,
        assessmentId: assessment?.id.toString(),
        rosterCountScore: assessment?.rosterCountScore === null || assessment?.rosterCountScore === undefined ? undefined : Number(assessment.rosterCountScore),
        topStarterScore: assessment?.topStarterScore === null || assessment?.topStarterScore === undefined ? undefined : Number(assessment.topStarterScore),
        secondStarterScore: assessment?.secondStarterScore === null || assessment?.secondStarterScore === undefined ? undefined : Number(assessment.secondStarterScore),
        depthQualityScore: assessment?.depthQualityScore === null || assessment?.depthQualityScore === undefined ? undefined : Number(assessment.depthQualityScore),
        productionScore: assessment?.productionScore === null || assessment?.productionScore === undefined ? undefined : Number(assessment.productionScore),
        assignmentGradeScore: assessment?.assignmentGradeScore === null || assessment?.assignmentGradeScore === undefined ? undefined : Number(assessment.assignmentGradeScore),
        roleCompletenessScore: assessment?.roleCompletenessScore === null || assessment?.roleCompletenessScore === undefined ? undefined : Number(assessment.roleCompletenessScore),
        contextRiskScore: positionContexts.length > 0 ? Math.round(combinedContextRisk * 100) / 100 : (assessment?.contextRiskScore === null || assessment?.contextRiskScore === undefined ? undefined : Number(assessment.contextRiskScore)),
        dataConfidence: assessment?.dataConfidence === undefined ? undefined : Number(assessment.dataConfidence),
        finalNeedScore: assessment?.finalNeedScore === null || assessment?.finalNeedScore === undefined ? undefined : Number(assessment.finalNeedScore),
        priority: assessment?.priority ?? undefined,
        reason: assessment?.reason ?? undefined,
        contextCount: positionContexts.length,
      };
    });
  }

  public async persistRecommendations(
    teamId: number,
    draftYear: number,
    records: readonly GeneratedTeamNeedRecord[],
    replaceRecommendations: boolean,
  ): Promise<PersistGeneratedTeamNeedsResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.teamNeed.findMany({ where: { teamId, draftYear } });
      const existingByPosition = new Map(existing.map((row) => [row.position, row]));
      const generatedPositions = new Set(records.map((record) => record.position));
      let created = 0;
      let updated = 0;
      let preserved = 0;
      let removed = 0;

      for (const record of records) {
        const current = existingByPosition.get(record.position);
        const canReplace = !current || (current.source === 'GENERATED' && current.status === 'RECOMMENDED');
        if (!canReplace) {
          preserved += 1;
          continue;
        }

        if (!current) {
          await tx.teamNeed.create({ data: { ...record, source: 'GENERATED', status: 'RECOMMENDED' } });
          created += 1;
        } else if (replaceRecommendations) {
          await tx.teamNeed.update({
            where: { id: current.id },
            data: {
              priority: record.priority,
              needScore: record.needScore,
              asOfDate: record.asOfDate,
              algorithmVersion: record.algorithmVersion,
              rationaleJson: record.rationaleJson,
              inputSnapshotJson: record.inputSnapshotJson,
              generatedByJobId: record.generatedByJobId,
              source: 'GENERATED',
              status: 'RECOMMENDED',
              reviewedByPersonId: null,
              reviewedAt: null,
            },
          });
          updated += 1;
        } else {
          preserved += 1;
        }
      }

      if (replaceRecommendations) {
        const staleIds = existing
          .filter((row) => row.source === 'GENERATED' && row.status === 'RECOMMENDED' && !generatedPositions.has(row.position))
          .map((row) => row.id);
        if (staleIds.length > 0) {
          const result = await tx.teamNeed.deleteMany({ where: { id: { in: staleIds } } });
          removed = result.count;
        }
      }

      return { created, updated, preserved, removed };
    }, { isolationLevel: 'ReadCommitted' as Prisma.TransactionIsolationLevel });
  }
}
