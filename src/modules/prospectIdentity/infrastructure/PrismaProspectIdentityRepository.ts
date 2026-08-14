import type { Prisma, PrismaClient } from '@prisma/client';
import type { IProspectIdentityRepository, IdentityReviewCommand, ProspectIdentityTransaction } from '../domain/IProspectIdentityRepository';
import type { DuplicateCandidate, MergeConflict, MergePreview, ProspectIdentityPreflightStatus, ProspectIdentitySummary } from '../domain/prospectIdentity.types';
import { ProspectDuplicateScoringService, normalizeProspectName } from '../application/ProspectDuplicateScoringService';
import { DpaJobType } from '@/modules/jobs/domain/enums/DpaJobType';

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === 'bigint') return item.toString();
    if (item instanceof Date) return item.toISOString();
    if (typeof item === 'object' && item !== null && 'toNumber' in item && typeof (item as { toNumber?: unknown }).toNumber === 'function') {
      return (item as { toNumber: () => number }).toNumber();
    }
    return item;
  })) as Prisma.InputJsonValue;

const summarySelect = {
  id: true, firstName: true, lastName: true, position: true, college: true,
  draftYear: true, homeCity: true, homeState: true,
} as const;

const toSummary = (row: ProspectIdentitySummary): ProspectIdentitySummary => row;
const isEmpty = (value: unknown): boolean => value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0);

export class PrismaProspectIdentityRepository implements IProspectIdentityRepository {
  private readonly scoring = new ProspectDuplicateScoringService();
  public constructor(private readonly prisma: PrismaClient) {}

  public async listDuplicateCandidates(status?: string): Promise<readonly DuplicateCandidate[]> {
    const reviews = await this.prisma.prospectDuplicateReview.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { matchScore: 'desc' }, { createdAt: 'asc' }],
    });
    const ids = Array.from(new Set(reviews.flatMap((r) => [r.leftProspectId, r.rightProspectId])));
    const prospects = await this.prisma.prospect.findMany({ where: { id: { in: ids } }, select: summarySelect });
    const byId = new Map(prospects.map((p) => [p.id, toSummary(p)]));
    return reviews.map((review) => ({
      id: review.id,
      left: byId.get(review.leftProspectId) ?? null,
      right: byId.get(review.rightProspectId) ?? null,
      matchScore: review.matchScore,
      matchReasons: Array.isArray(review.matchReasonsJson) ? review.matchReasonsJson.filter((v): v is string => typeof v === 'string') : [],
      status: review.status,
      resolution: review.resolution,
      resolutionNotes: review.resolutionNotes,
      createdAt: review.createdAt,
      reviewedAt: review.reviewedAt,
    }));
  }

  public async listIdentityReviews(status?: string): Promise<readonly unknown[]> {
    return this.prisma.prospectIdentityReview.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  public async listMergeAudits(limit: number): Promise<readonly unknown[]> {
    return this.prisma.prospectMergeAudit.findMany({ orderBy: { performedAt: 'desc' }, take: Math.min(Math.max(limit, 1), 500) });
  }

  public async getPreflightStatus(draftYear: number, position: string): Promise<ProspectIdentityPreflightStatus> {
    const prospects = await this.prisma.prospect.findMany({
      where: { draftYear, position },
      select: { id: true, createdAt: true, updatedAt: true },
    });
    const prospectIds = prospects.map((prospect) => prospect.id);
    const latestProspectChangeAt = prospects.reduce<Date | null>((latest, prospect) => {
      const changedAt = prospect.updatedAt ?? prospect.createdAt ?? null;
      return changedAt !== null && (latest === null || changedAt > latest) ? changedAt : latest;
    }, null);

    const [latestScan, unresolvedDuplicateCount, unresolvedIdentityCount] = await Promise.all([
      this.prisma.job.findFirst({
        where: { type: DpaJobType.DetectProspectDuplicates, status: 'completed' },
        orderBy: { finishedAt: 'desc' },
        select: { finishedAt: true },
      }),
      prospectIds.length === 0 ? Promise.resolve(0) : this.prisma.prospectDuplicateReview.count({
        where: {
          status: { in: ['OPEN', 'DEFERRED'] },
          OR: [
            { leftProspectId: { in: prospectIds } },
            { rightProspectId: { in: prospectIds } },
          ],
        },
      }),
      prospectIds.length === 0 ? Promise.resolve(0) : this.prisma.prospectIdentityReview.count({
        where: {
          status: { in: ['OPEN', 'DEFERRED'] },
          OR: [
            { prospectId: { in: prospectIds } },
            { candidateProspectId: { in: prospectIds } },
          ],
        },
      }),
    ]);

    const latestCompletedScanAt = latestScan?.finishedAt ?? null;
    const scanState: ProspectIdentityPreflightStatus['scanState'] = latestCompletedScanAt === null
      ? 'NEVER_RUN'
      : latestProspectChangeAt !== null && latestProspectChangeAt > latestCompletedScanAt
        ? 'STALE'
        : 'CURRENT';

    return {
      draftYear,
      position,
      prospectCount: prospects.length,
      scanState,
      latestCompletedScanAt,
      latestProspectChangeAt,
      unresolvedDuplicateCount,
      unresolvedIdentityCount,
    };
  }

  public async detectDuplicateCandidates(): Promise<{ scanned: number; candidates: number; createdOrUpdated: number }> {
    const prospects = await this.prisma.prospect.findMany({ select: summarySelect, orderBy: { id: 'asc' } });
    let candidates = 0;
    let createdOrUpdated = 0;
    for (let i = 0; i < prospects.length; i += 1) {
      for (let j = i + 1; j < prospects.length; j += 1) {
        const left = prospects[i];
        const right = prospects[j];
        if (left.draftYear !== null && right.draftYear !== null && left.draftYear !== right.draftYear) continue;
        if (normalizeProspectName(left.position) !== normalizeProspectName(right.position)) continue;
        const { score, reasons } = this.scoring.score(left, right);
        if (score < 55) continue;
        candidates += 1;
        const fingerprint = [
          normalizeProspectName(`${left.firstName} ${left.lastName}`),
          normalizeProspectName(`${right.firstName} ${right.lastName}`),
          left.draftYear ?? '', left.position, left.college, right.college,
        ].join('|').slice(0, 255);
        const existing = await this.prisma.prospectDuplicateReview.findUnique({
          where: { leftProspectId_rightProspectId: { leftProspectId: left.id, rightProspectId: right.id } },
        });
        if (existing?.status === 'NOT_DUPLICATE' && existing.fingerprint === fingerprint) continue;
        await this.prisma.prospectDuplicateReview.upsert({
          where: { leftProspectId_rightProspectId: { leftProspectId: left.id, rightProspectId: right.id } },
          create: { leftProspectId: left.id, rightProspectId: right.id, matchScore: score, matchReasonsJson: reasons, fingerprint, status: 'OPEN' },
          update: existing?.status === 'NOT_DUPLICATE'
            ? { matchScore: score, matchReasonsJson: reasons, fingerprint, status: 'OPEN', reviewedAt: null, reviewedByPersonId: null, resolution: null, resolutionNotes: null }
            : { matchScore: score, matchReasonsJson: reasons, fingerprint },
        });
        createdOrUpdated += 1;
      }
    }
    return { scanned: prospects.length, candidates, createdOrUpdated };
  }

  public async previewMerge(survivorProspectId: number, duplicateProspectId: number): Promise<MergePreview> {
    return this.prisma.$transaction((tx) => this.buildMergePreview(tx, survivorProspectId, duplicateProspectId));
  }

  private async buildMergePreview(tx: ProspectIdentityTransaction, survivorId: number, duplicateId: number): Promise<MergePreview> {
    const [survivor, duplicate] = await Promise.all([
      tx.prospect.findUnique({ where: { id: survivorId } }),
      tx.prospect.findUnique({ where: { id: duplicateId } }),
    ]);
    if (!survivor || !duplicate) throw new Error('Both survivor and duplicate Prospect rows must exist.');

    const fieldsCopied: Record<string, unknown> = {};
    for (const key of ['firstName','lastName','position','college','homeCity','homeState','draftYear','teamId','draftPickId'] as const) {
      const survivorValue = survivor[key];
      const duplicateValue = duplicate[key];
      if (isEmpty(survivorValue) && !isEmpty(duplicateValue)) fieldsCopied[key] = duplicateValue;
    }

    const [
      survivorCombine, duplicateCombine, survivorMetrics, duplicateMetrics,
      survivorRankings, duplicateRankings, survivorRva, duplicateRva,
      survivorPostMetrics, duplicatePostMetrics,
      players, draftPicks, simulations, postEvals, b4meEvals,
    ] = await Promise.all([
      tx.combineScore.findUnique({ where: { prospectId: survivorId } }),
      tx.combineScore.findUnique({ where: { prospectId: duplicateId } }),
      tx.b4MeWRMetrics.findUnique({ where: { prospectId: survivorId } }),
      tx.b4MeWRMetrics.findUnique({ where: { prospectId: duplicateId } }),
      tx.prospectRanking.findMany({ where: { prospectId: survivorId } }),
      tx.prospectRanking.findMany({ where: { prospectId: duplicateId } }),
      tx.b4MeProspectRvaEvaluation.findMany({ where: { prospectId: survivorId } }),
      tx.b4MeProspectRvaEvaluation.findMany({ where: { prospectId: duplicateId } }),
      tx.postDraftWRMetric.findMany({ where: { prospectId: survivorId } }),
      tx.postDraftWRMetric.findMany({ where: { prospectId: duplicateId } }),
      tx.player.count({ where: { prospectId: duplicateId } }),
      tx.draftPick.count({ where: { prospectId: duplicateId } }),
      tx.draftSimulationPick.count({ where: { draftedProspectId: duplicateId } }),
      tx.postDraftPickEvaluation.count({ where: { prospectId: duplicateId } }),
      tx.b4MeProspectEvaluation.count({ where: { prospectId: duplicateId } }),
    ]);

    const conflicts: MergeConflict[] = [];
    if (survivorCombine && duplicateCombine) conflicts.push({ relation: 'CombineScore', reason: 'ONE_TO_ONE_SURVIVOR_EXISTS', survivor: survivorCombine, duplicate: duplicateCombine });
    if (survivorMetrics && duplicateMetrics) conflicts.push({ relation: 'B4MeWRMetrics', reason: 'ONE_TO_ONE_SURVIVOR_EXISTS_PRESERVE_PROVENANCE', survivor: survivorMetrics, duplicate: duplicateMetrics });

    const survivorRankingSources = new Map(survivorRankings.map((r) => [r.source, r]));
    for (const row of duplicateRankings) {
      const existing = survivorRankingSources.get(row.source);
      if (existing) conflicts.push({ relation: 'ProspectRanking', reason: `UNIQUE_SOURCE_CONFLICT:${row.source}`, survivor: existing, duplicate: row });
    }
    const survivorRvaModes = new Map(survivorRva.map((r) => [r.scoringMode, r]));
    for (const row of duplicateRva) {
      const existing = survivorRvaModes.get(row.scoringMode);
      if (existing) conflicts.push({ relation: 'B4MeProspectRvaEvaluation', reason: `UNIQUE_SCORING_MODE_CONFLICT:${row.scoringMode}`, survivor: existing, duplicate: row });
    }
    const postKey = (r: { draftYear:number; seasonYear:number; sourceType:string; sourceName:string; sourceReferenceKey:string }) => `${r.draftYear}|${r.seasonYear}|${r.sourceType}|${r.sourceName}|${r.sourceReferenceKey}`;
    const survivorPostKeys = new Map(survivorPostMetrics.map((r) => [postKey(r), r]));
    for (const row of duplicatePostMetrics) {
      const existing = survivorPostKeys.get(postKey(row));
      if (existing) conflicts.push({ relation: 'PostDraftWRMetric', reason: 'UNIQUE_LOGICAL_METRIC_CONFLICT', survivor: existing, duplicate: row });
    }

    const relationsToMove: Record<string, number> = {
      CombineScore: duplicateCombine && !survivorCombine ? 1 : 0,
      B4MeWRMetrics: duplicateMetrics && !survivorMetrics ? 1 : 0,
      ProspectRanking: duplicateRankings.length - duplicateRankings.filter((r) => survivorRankingSources.has(r.source)).length,
      B4MeProspectRvaEvaluation: duplicateRva.length - duplicateRva.filter((r) => survivorRvaModes.has(r.scoringMode)).length,
      PostDraftWRMetric: duplicatePostMetrics.length - duplicatePostMetrics.filter((r) => survivorPostKeys.has(postKey(r))).length,
      Player: players,
      DraftPick: draftPicks,
      DraftSimulationPick: simulations,
      PostDraftPickEvaluation: postEvals,
      B4MeProspectEvaluation: b4meEvals,
    };
    const dependencyCounts = { ...relationsToMove, conflicts: conflicts.length };
    return { survivor: toSummary(survivor), duplicate: toSummary(duplicate), fieldsCopied, relationsToMove, conflicts, dependencyCounts };
  }

  public async merge(survivorId: number, duplicateId: number, actorPersonId: number | null, reason: string): Promise<{ auditId: number }> {
    return this.prisma.$transaction(async (tx) => {
      const preview = await this.buildMergePreview(tx, survivorId, duplicateId);
      const survivorBefore = await tx.prospect.findUniqueOrThrow({ where: { id: survivorId } });
      const duplicateBefore = await tx.prospect.findUniqueOrThrow({ where: { id: duplicateId } });
      await tx.prospect.update({ where: { id: survivorId }, data: { ...(preview.fieldsCopied as Prisma.ProspectUncheckedUpdateInput), updatedAt: new Date() } });

      const moved: Record<string, number> = {};
      if (preview.relationsToMove.CombineScore === 1) { await tx.combineScore.update({ where: { prospectId: duplicateId }, data: { prospectId: survivorId } }); moved.CombineScore = 1; }
      if (preview.relationsToMove.B4MeWRMetrics === 1) { await tx.b4MeWRMetrics.update({ where: { prospectId: duplicateId }, data: { prospectId: survivorId } }); moved.B4MeWRMetrics = 1; }

      const survivorRankingSources = new Set((await tx.prospectRanking.findMany({ where: { prospectId: survivorId }, select: { source: true } })).map((r) => r.source));
      const duplicateRankings = await tx.prospectRanking.findMany({ where: { prospectId: duplicateId } });
      const rankingMoveIds = duplicateRankings.filter((r) => !survivorRankingSources.has(r.source)).map((r) => r.id);
      if (rankingMoveIds.length) await tx.prospectRanking.updateMany({ where: { id: { in: rankingMoveIds } }, data: { prospectId: survivorId } });
      moved.ProspectRanking = rankingMoveIds.length;

      const survivorModes = new Set((await tx.b4MeProspectRvaEvaluation.findMany({ where: { prospectId: survivorId }, select: { scoringMode: true } })).map((r) => r.scoringMode));
      const duplicateRva = await tx.b4MeProspectRvaEvaluation.findMany({ where: { prospectId: duplicateId } });
      const rvaMoveIds = duplicateRva.filter((r) => !survivorModes.has(r.scoringMode)).map((r) => r.id);
      for (const id of rvaMoveIds) await tx.b4MeProspectRvaEvaluation.update({ where: { id }, data: { prospectId: survivorId } });
      moved.B4MeProspectRvaEvaluation = rvaMoveIds.length;

      const postKey = (r: { draftYear:number; seasonYear:number; sourceType:string; sourceName:string; sourceReferenceKey:string }) => `${r.draftYear}|${r.seasonYear}|${r.sourceType}|${r.sourceName}|${r.sourceReferenceKey}`;
      const survivorPostKeys = new Set((await tx.postDraftWRMetric.findMany({ where: { prospectId: survivorId } })).map(postKey));
      const duplicatePost = await tx.postDraftWRMetric.findMany({ where: { prospectId: duplicateId } });
      const postMoveIds = duplicatePost.filter((r) => !survivorPostKeys.has(postKey(r))).map((r) => r.id);
      for (const id of postMoveIds) await tx.postDraftWRMetric.update({ where: { id }, data: { prospectId: survivorId } });
      moved.PostDraftWRMetric = postMoveIds.length;

      moved.Player = (await tx.player.updateMany({ where: { prospectId: duplicateId }, data: { prospectId: survivorId } })).count;
      moved.DraftPick = (await tx.draftPick.updateMany({ where: { prospectId: duplicateId }, data: { prospectId: survivorId } })).count;
      moved.DraftSimulationPick = (await tx.draftSimulationPick.updateMany({ where: { draftedProspectId: duplicateId }, data: { draftedProspectId: survivorId } })).count;
      moved.PostDraftPickEvaluation = (await tx.postDraftPickEvaluation.updateMany({ where: { prospectId: duplicateId }, data: { prospectId: survivorId } })).count;
      moved.B4MeProspectEvaluation = (await tx.b4MeProspectEvaluation.updateMany({ where: { prospectId: duplicateId }, data: { prospectId: survivorId } })).count;

      if (preview.conflicts.some((conflict) => conflict.relation === 'CombineScore')) {
        await tx.combineScore.deleteMany({ where: { prospectId: duplicateId } });
      }

      const audit = await tx.prospectMergeAudit.create({ data: {
        survivorProspectId: survivorId, duplicateProspectId: duplicateId, mergePolicy: 'FILL_EMPTY_ONLY',
        survivorBeforeJson: toJsonValue(survivorBefore), duplicateBeforeJson: toJsonValue(duplicateBefore),
        fieldsCopiedJson: toJsonValue(preview.fieldsCopied), relationsMovedJson: toJsonValue(moved), conflictsJson: toJsonValue(preview.conflicts),
        performedByPersonId: actorPersonId, reason,
      }});

      const leftProspectId = Math.min(survivorId, duplicateId);
      const rightProspectId = Math.max(survivorId, duplicateId);
      await tx.prospectDuplicateReview.updateMany({ where: { leftProspectId, rightProspectId }, data: { status: 'MERGED', resolution: survivorId === leftProspectId ? 'MERGE_INTO_LEFT' : 'MERGE_INTO_RIGHT', resolutionNotes: reason, reviewedAt: new Date(), reviewedByPersonId: actorPersonId } });
      await tx.prospect.delete({ where: { id: duplicateId } });
      return { auditId: audit.id };
    });
  }

  public async resolveDuplicateReview(reviewId: number, status: string, actorPersonId: number | null, resolution: string, notes: string | null): Promise<void> {
    await this.prisma.prospectDuplicateReview.update({ where: { id: reviewId }, data: { status, resolution, resolutionNotes: notes, reviewedAt: new Date(), reviewedByPersonId: actorPersonId } });
  }

  public async createIdentityReview(command: IdentityReviewCommand): Promise<number> {
    const recent = await this.prisma.prospectIdentityReview.findFirst({
      where: { prospectId: command.prospectId, provider: command.provider, requestedName: command.requestedName, resolvedName: command.resolvedName, reason: command.reason, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return recent.id;
    const row = await this.prisma.prospectIdentityReview.create({ data: {
      prospectId: command.prospectId, candidateProspectId: command.candidateProspectId ?? null, provider: command.provider,
      requestedName: command.requestedName, resolvedName: command.resolvedName, confidenceScore: command.confidenceScore,
      reason: command.reason, providerPayloadJson: command.providerPayloadJson,
    }});
    return row.id;
  }

  public async resolveIdentityReview(reviewId: number, status: string, actorPersonId: number | null, resolution: string, notes: string | null): Promise<void> {
    await this.prisma.prospectIdentityReview.update({ where: { id: reviewId }, data: { status, resolution, notes, reviewedAt: new Date(), reviewedByPersonId: actorPersonId } });
  }

  public async hasOpenIdentityIssue(prospectId: number): Promise<boolean> {
    const count = await this.prisma.prospectIdentityReview.count({ where: { prospectId, status: { in: ['OPEN', 'DEFERRED'] } } });
    return count > 0;
  }

  public async hasOpenDuplicateIssue(prospectId: number): Promise<boolean> {
    const count = await this.prisma.prospectDuplicateReview.count({
      where: {
        status: { in: ['OPEN', 'DEFERRED'] },
        OR: [{ leftProspectId: prospectId }, { rightProspectId: prospectId }],
      },
    });
    return count > 0;
  }

  public async deleteProspect(prospectId: number, actorPersonId: number | null, reason: string): Promise<{ auditId: number }> {
    return this.prisma.$transaction(async (tx) => {
      const prospect = await tx.prospect.findUnique({ where: { id: prospectId } });
      if (!prospect) throw new Error('Prospect not found.');
      const counts = {
        CombineScore: await tx.combineScore.count({ where: { prospectId } }),
        B4MeWRMetrics: await tx.b4MeWRMetrics.count({ where: { prospectId } }),
        ProspectRanking: await tx.prospectRanking.count({ where: { prospectId } }),
        B4MeProspectRvaEvaluation: await tx.b4MeProspectRvaEvaluation.count({ where: { prospectId } }),
        PostDraftWRMetric: await tx.postDraftWRMetric.count({ where: { prospectId } }),
        Player: await tx.player.count({ where: { prospectId } }),
        DraftPick: await tx.draftPick.count({ where: { prospectId } }),
        DraftSimulationPick: await tx.draftSimulationPick.count({ where: { draftedProspectId: prospectId } }),
        PostDraftPickEvaluation: await tx.postDraftPickEvaluation.count({ where: { prospectId } }),
        B4MeProspectEvaluation: await tx.b4MeProspectEvaluation.count({ where: { prospectId } }),
      };
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
      if (total > 0) throw new Error(`Delete blocked: prospect still has ${total} dependent record(s). Merge is required. Dependencies: ${JSON.stringify(counts)}`);
      const audit = await tx.prospectMergeAudit.create({ data: {
        survivorProspectId: prospectId, duplicateProspectId: prospectId, mergePolicy: 'DELETE_ONLY',
        survivorBeforeJson: toJsonValue(prospect), duplicateBeforeJson: toJsonValue(prospect), fieldsCopiedJson: {}, relationsMovedJson: {},
        conflictsJson: [], performedByPersonId: actorPersonId, reason,
      }});
      await tx.prospect.delete({ where: { id: prospectId } });
      await tx.prospectDuplicateReview.updateMany({ where: { OR: [{ leftProspectId: prospectId }, { rightProspectId: prospectId }] }, data: { status: 'DELETED', resolution: 'DELETE_DUPLICATE', resolutionNotes: reason, reviewedAt: new Date(), reviewedByPersonId: actorPersonId } });
      return { auditId: audit.id };
    });
  }
}
