import type { Prisma, PrismaClient } from '@prisma/client';
import type { WrAdvancedMetricsProvider } from '../domain/WrAdvancedMetricsProvider';
import { WR_METRIC_FIELDS, type ResolvedWrMetricMap, type WrAdvancedMetricsResult, type WrMetricField, type WrMetricSourceType } from '../domain/WrAdvancedMetrics.types';

interface CandidateRecord {
  id: bigint;
  seasonYear: number;
  sourceName: string;
  sourceType: string;
  sourceReference: string | null;
  verified: boolean;
  providerPriority: number | null;
  updatedAt: Date;
  yardsPerRouteRun: Prisma.Decimal | null;
  receivingGrade: Prisma.Decimal | null;
  contestedCatchRate: Prisma.Decimal | null;
  behindLosTargetRate: Prisma.Decimal | null;
  catchRate: Prisma.Decimal | null;
  missedTacklesForcedPerReception: Prisma.Decimal | null;
  yacAfterContactPerReception: Prisma.Decimal | null;
}

const defaultPriority = (sourceType: string, verified: boolean): number => {
  const key = `${verified ? 'VERIFIED' : 'UNVERIFIED'}:${sourceType}`;
  const priorities: Record<string, number> = {
    'VERIFIED:LICENSED_PROVIDER': 10, 'VERIFIED:MANUAL': 20, 'VERIFIED:CSV': 30,
    'VERIFIED:FREE_API': 40, 'VERIFIED:DPA': 50, 'VERIFIED:DERIVED': 60,
    'UNVERIFIED:LICENSED_PROVIDER': 70, 'UNVERIFIED:MANUAL': 80, 'UNVERIFIED:CSV': 90,
    'UNVERIFIED:FREE_API': 100, 'UNVERIFIED:DPA': 110, 'UNVERIFIED:DERIVED': 120,
  };
  return priorities[key] ?? 999;
};

export class PrismaWrAdvancedMetricsProvider implements WrAdvancedMetricsProvider {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getMetrics(prospectId: number, draftYear: number): Promise<WrAdvancedMetricsResult | null> {
    const [records, rules] = await Promise.all([
      this.prisma.postDraftWRMetric.findMany({ where: { prospectId, draftYear, active: true } }),
      this.prisma.postDraftMetricProviderRule.findMany({ where: { active: true }, orderBy: { priority: 'asc' } }),
    ]);
    if (records.length === 0) return null;
    const rulePriority = new Map(rules.map((rule) => [`${rule.verified ? 'VERIFIED' : 'UNVERIFIED'}:${rule.sourceType}`, rule.priority]));
    const priority = (row: CandidateRecord): number => row.providerPriority ?? rulePriority.get(`${row.verified ? 'VERIFIED' : 'UNVERIFIED'}:${row.sourceType}`) ?? defaultPriority(row.sourceType, row.verified);
    const ordered = [...records].sort((left, right) => priority(left) - priority(right) || right.seasonYear - left.seasonYear || right.updatedAt.getTime() - left.updatedAt.getTime() || Number(right.id - left.id));
    const metrics = {} as ResolvedWrMetricMap;
    for (const field of WR_METRIC_FIELDS) {
      const selected = ordered.find((record) => record[field] !== null);
      metrics[field] = selected ? {
        value: Number(selected[field]), sourceType: selected.sourceType as WrMetricSourceType,
        sourceName: selected.sourceName, sourceReference: selected.sourceReference, verified: selected.verified,
        recordId: selected.id.toString(), providerPriority: priority(selected), seasonYear: selected.seasonYear,
        updatedAt: selected.updatedAt.toISOString(),
      } : null;
    }
    const resolvedRecordIds = [...new Set(WR_METRIC_FIELDS.map((field: WrMetricField) => metrics[field]?.recordId).filter((id): id is string => id !== undefined))];
    const missingMetrics = WR_METRIC_FIELDS.filter((field) => metrics[field] === null);
    return { prospectId, draftYear, metrics, resolvedRecordIds, missingMetrics };
  }
}
