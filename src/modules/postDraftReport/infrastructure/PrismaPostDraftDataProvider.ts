import type { PrismaClient } from '@prisma/client';
import type { IPostDraftDataProvider } from '../domain/IPostDraftDataProvider';
import type { DraftPickInput, WrMetricSnapshot } from '../domain/PostDraftReport.types';
import { EvaluateWrProspectService } from '../application/EvaluateWrProspectService';
import { PrismaWrAdvancedMetricsProvider } from '../../postDraftMetrics/infrastructure/PrismaWrAdvancedMetricsProvider';

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle];
}

function athleticScore(prospect: {
  fortyTime: number | null; verticalLeap: number | null; broadJump: number | null;
  threeCone: number | null; twentyYardShuttle: number | null;
} | null): number | null {
  if (prospect === null) return null;
  const scores: number[] = [];
  if (prospect.fortyTime !== null) scores.push(Math.max(0, Math.min(100, ((5.2 - prospect.fortyTime) / 1.0) * 100)));
  if (prospect.verticalLeap !== null) scores.push(Math.max(0, Math.min(100, ((prospect.verticalLeap - 25) / 20) * 100)));
  if (prospect.broadJump !== null) scores.push(Math.max(0, Math.min(100, ((prospect.broadJump - 95) / 45) * 100)));
  if (prospect.threeCone !== null) scores.push(Math.max(0, Math.min(100, ((8.0 - prospect.threeCone) / 1.5) * 100)));
  if (prospect.twentyYardShuttle !== null) scores.push(Math.max(0, Math.min(100, ((5.0 - prospect.twentyYardShuttle) / 1.2) * 100)));
  return scores.length === 0 ? null : Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
}

const decimal = (value: unknown): number | null => value === null || value === undefined ? null : Number(value);

export class PrismaPostDraftDataProvider implements IPostDraftDataProvider {
  private readonly wrEvaluator = new EvaluateWrProspectService();
  private readonly advancedWrProvider: PrismaWrAdvancedMetricsProvider;
  public constructor(private readonly prisma: PrismaClient) {
    this.advancedWrProvider = new PrismaWrAdvancedMetricsProvider(prisma);
  }

  public async getTeamDraftPicks(teamId: number, draftYear: number): Promise<DraftPickInput[]> {
    const rows = await this.prisma.draftPick.findMany({
      where: { currentTeamId: teamId, draftYear, used: true },
      orderBy: { pickNumber: 'asc' },
      include: {
        Team: { select: { name: true } },
        Prospect_DraftPick_prospectIdToProspect: {
          select: {
            id: true, firstName: true, lastName: true, position: true, college: true,
            fortyTime: true, verticalLeap: true, broadJump: true, threeCone: true, twentyYardShuttle: true,
            ProspectRanking: { select: { overallRank: true, source: true } },
            B4MeWRMetrics: true
          }
        }
      }
    });

    return Promise.all(rows.map(async (row): Promise<DraftPickInput> => {
      const prospect = row.Prospect_DraftPick_prospectIdToProspect;
      const position = (row.position ?? prospect?.position ?? 'UNKNOWN').toUpperCase();
      const rankingValues = prospect?.ProspectRanking.map((ranking) => ranking.overallRank) ?? [];
      const b4me = prospect === null || prospect === undefined ? null : await this.prisma.b4MeProspectEvaluation.findFirst({
        where: { prospectId: prospect.id, positionGroup: position === 'WR' ? 'WR' : position },
        orderBy: { computedAt: 'desc' },
        select: { finalB4MeScore: true }
      });
      const need = await this.prisma.teamNeed.findFirst({
        where: { teamId, position, draftYear, status: 'APPROVED' },
        orderBy: { priority: 'asc' },
        select: { priority: true }
      });
      const playerName = prospect
        ? `${prospect.firstName} ${prospect.lastName}`.trim()
        : `${row.playerFirstName ?? ''} ${row.playerLastName ?? ''}`.trim() || 'Unknown Player';
      const aScore = athleticScore(prospect ?? null);
      const consensusRank = median(rankingValues);
      const b4meScore = decimal(b4me?.finalB4MeScore);
      const wr = prospect?.B4MeWRMetrics;
      const resolvedAdvanced = position === 'WR' && prospect ? await this.advancedWrProvider.getMetrics(prospect.id, draftYear) : null;
      const resolved = resolvedAdvanced?.metrics;
      const hasLegacyOrAdvanced = position === 'WR' && (wr !== null && wr !== undefined || resolvedAdvanced !== null);
      const wrMetrics: WrMetricSnapshot | null = hasLegacyOrAdvanced ? {
        yprr: resolved?.yardsPerRouteRun?.value ?? decimal(wr?.yprr),
        pffOverallGrade: resolved?.receivingGrade?.value ?? decimal(wr?.pffOverallGrade),
        contestedCatchRate: resolved?.contestedCatchRate?.value ?? decimal(wr?.contestedCatchRate),
        behindLosTargetRate: resolved?.behindLosTargetRate?.value ?? decimal(wr?.behindLosTargetRate),
        catchRate: resolved?.catchRate?.value ?? (wr?.targets && wr.receptions !== null && wr.receptions !== undefined ? Number(((wr.receptions / wr.targets) * 100).toFixed(2)) : null),
        receptions: wr?.receptions ?? null, targets: wr?.targets ?? null,
        missedTacklesForcedPerReception: resolved?.missedTacklesForcedPerReception?.value ?? decimal(wr?.missedTacklesForcedPerReception),
        yacAfterContactPerReception: resolved?.yacAfterContactPerReception?.value ?? decimal(wr?.yacAfterContactPerReception),
        routesRun: wr?.routesRun ?? null, gamesPlayed: wr?.gamesPlayed ?? null,
        sourceMetadata: wr?.sourceMetadataJson ?? null,
        provenance: resolvedAdvanced,
        resolvedRecordIds: resolvedAdvanced?.resolvedRecordIds ?? []
      } : null;
      const wrEvaluation = wrMetrics ? this.wrEvaluator.evaluate({ metrics: wrMetrics, athleticScore: aScore, b4meScore, consensusRank }) : null;
      const availableSignals: string[] = [];
      const missingSignals: string[] = [];
      if (b4meScore !== null) availableSignals.push('B4Me evaluation'); else missingSignals.push('B4Me evaluation');
      if (consensusRank !== null) availableSignals.push('consensus ranking'); else missingSignals.push('consensus ranking');
      if (aScore !== null) availableSignals.push('athletic testing'); else missingSignals.push('athletic testing');
      if (need !== null) availableSignals.push('team need'); else missingSignals.push('team need');
      if (position === 'WR') {
        if (wrEvaluation !== null) availableSignals.push('WR position evaluation'); else missingSignals.push('WR position evaluation');
        for (const metric of wrEvaluation?.missingMetrics ?? []) missingSignals.push(metric);
      }

      return {
        draftPickId: row.id, teamId, teamName: row.Team.name, draftYear,
        round: row.round, pickNumber: row.pickNumber, pickInRound: row.pickInRound,
        playerName, position, college: row.college ?? prospect?.college ?? null,
        teamNeedPriority: need?.priority ?? null,
        metrics: {
          prospectId: prospect?.id ?? null, playerName, position,
          college: row.college ?? prospect?.college ?? null,
          b4meScore, consensusRank, rankingSourceCount: rankingValues.length,
          athleticScore: aScore, wrMetrics, wrEvaluation, availableSignals,
          missingSignals: [...new Set(missingSignals)]
        }
      };
    }));
  }
}
