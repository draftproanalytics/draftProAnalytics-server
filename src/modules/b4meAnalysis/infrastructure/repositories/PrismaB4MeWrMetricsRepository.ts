import type { Prisma, PrismaClient } from '@prisma/client';
import type { IB4MeWrMetricsRepository } from '../../domain/repositories/IB4MeWrMetricsRepository';
import type {
  WrMetricsRecord,
  WrSourceMetadataRecord
} from '../../domain/contracts/WrFramework.types';

function toSourceMetadataRecord(
  value: Prisma.JsonValue | null
): WrSourceMetadataRecord | null {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    provider: typeof record.provider === 'string' ? record.provider : 'HYBRID_PUBLIC',
    playerSearchName:
      typeof record.playerSearchName === 'string' ? record.playerSearchName : '',
    resolvedPlayerName:
      typeof record.resolvedPlayerName === 'string' ? record.resolvedPlayerName : '',
    draftYear: typeof record.draftYear === 'number' ? record.draftYear : null,
    sourcesUsed: Array.isArray(record.sourcesUsed)
      ? record.sourcesUsed.filter((item): item is string => typeof item === 'string')
      : [],
    observedFields: Array.isArray(record.observedFields)
      ? record.observedFields.filter((item): item is string => typeof item === 'string')
      : [],
    derivedFields: Array.isArray(record.derivedFields)
      ? record.derivedFields.filter((item): item is string => typeof item === 'string')
      : [],
    metricSeasonYear:
      typeof record.metricSeasonYear === 'number' ? record.metricSeasonYear : null,
    seasonSelectionPolicy:
      record.seasonSelectionPolicy === 'FINAL_COLLEGE_SEASON'
        ? 'FINAL_COLLEGE_SEASON'
        : null,
    injuryMissedGamesIsConfirmedOnly:
      typeof record.injuryMissedGamesIsConfirmedOnly === 'boolean'
        ? record.injuryMissedGamesIsConfirmedOnly
        : false,
    notes: Array.isArray(record.notes)
      ? record.notes.filter((item): item is string => typeof item === 'string')
      : [],
    manualObservation: (() => {
      const value = record.manualObservation;
      if (value === null || Array.isArray(value) || typeof value !== 'object') return null;
      const manual = value as Record<string, unknown>;
      if (manual.sourceType !== 'MANUAL' || typeof manual.sourceName !== 'string' ||
          typeof manual.enteredByPersonId !== 'number' || typeof manual.enteredAt !== 'string' ||
          typeof manual.metricSeasonYear !== 'number') return null;
      return {
        sourceType: 'MANUAL' as const,
        fields: Array.isArray(manual.fields)
          ? manual.fields.filter((item): item is string => typeof item === 'string')
          : [],
        sourceName: manual.sourceName,
        sourceUrl: typeof manual.sourceUrl === 'string' ? manual.sourceUrl : null,
        notes: typeof manual.notes === 'string' ? manual.notes : null,
        enteredByPersonId: manual.enteredByPersonId,
        enteredAt: manual.enteredAt,
        metricSeasonYear: manual.metricSeasonYear,
        seasonSelectionPolicy: 'FINAL_COLLEGE_SEASON' as const
      };
    })()
  };
}

export class PrismaB4MeWrMetricsRepository implements IB4MeWrMetricsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findByProspectId(prospectId: number): Promise<WrMetricsRecord | null> {
    const row = await this.prisma.b4MeWRMetrics.findUnique({
      where: { prospectId }
    });

    if (!row) {
      return null;
    }

    return {
      prospectId: row.prospectId,
      yprr: row.yprr !== null ? Number(row.yprr) : null,
      pffOverallGrade: row.pffOverallGrade !== null ? Number(row.pffOverallGrade) : null,
      contestedCatchRate:
        row.contestedCatchRate !== null ? Number(row.contestedCatchRate) : null,
      behindLosTargetRate:
        row.behindLosTargetRate !== null ? Number(row.behindLosTargetRate) : null,
      receptions: row.receptions,
      targets: row.targets,
      missedTacklesForcedPerReception:
        row.missedTacklesForcedPerReception !== null
          ? Number(row.missedTacklesForcedPerReception)
          : null,
      yacAfterContactPerReception:
        row.yacAfterContactPerReception !== null
          ? Number(row.yacAfterContactPerReception)
          : null,
      routesRun: row.routesRun,
      gamesPlayed: row.gamesPlayed,
      gamesMissed: row.gamesMissed,
      competitionLevel: row.competitionLevel,
      offensiveContextNotes: row.offensiveContextNotes,
      qbPlayQuality: row.qbPlayQuality !== null ? Number(row.qbPlayQuality) : null,
      pffRank: row.pffRank,
      yprrRank: row.yprrRank,
      pressManWinRate:
        row.pressManWinRate !== null ? Number(row.pressManWinRate) : null,
      releasePackageDepth: row.releasePackageDepth,
      routeFamilyDiversity: row.routeFamilyDiversity,
      alignmentFlexibilityIndex: row.alignmentFlexibilityIndex,
      rolePortabilityIndex: row.rolePortabilityIndex,
      usageAdaptabilityIndex: row.usageAdaptabilityIndex,
      slotRate: row.slotRate !== null ? Number(row.slotRate) : null,
      wideRate: row.wideRate !== null ? Number(row.wideRate) : null,
      boundaryRate: row.boundaryRate !== null ? Number(row.boundaryRate) : null,
      sourceMetadataJson: toSourceMetadataRecord(row.sourceMetadataJson)
    };
  }
}