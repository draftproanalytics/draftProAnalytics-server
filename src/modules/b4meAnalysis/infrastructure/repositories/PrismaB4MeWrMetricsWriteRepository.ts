import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  IB4MeWrMetricsWriteRepository,
  ManualWrObservedMetricsInput
} from '../../domain/repositories/IB4MeWrMetricsWriteRepository';
import type { LiveWrProspectPayload } from '../../domain/contracts/LiveWrProspect.types';
import { logger } from '@/utils/Logger';

const MANUAL_FIELDS = [
  'yprr',
  'pffOverallGrade',
  'contestedCatchRate',
  'behindLosTargetRate'
] as const;

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value !== null && !Array.isArray(value) && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export class PrismaB4MeWrMetricsWriteRepository implements IB4MeWrMetricsWriteRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async upsertFromLivePayload(
    prospectId: number,
    payload: LiveWrProspectPayload
  ): Promise<void> {
    const existing = await this.prisma.b4MeWRMetrics.findUnique({ where: { prospectId } });
    const existingMetadata = jsonRecord(existing?.sourceMetadataJson ?? null);
    const manualObservation = jsonRecord(existingMetadata.manualObservation);
    const manualFields = manualObservation.sourceType === 'MANUAL'
      ? stringArray(manualObservation.fields)
      : [];
    const preserveManual = (field: string): boolean => manualFields.includes(field);

    const incomingMetadata = payload.sourceMetadata as unknown as Record<string, unknown>;
    const observedFields = Array.from(new Set([
      ...stringArray(incomingMetadata.observedFields),
      ...manualFields
    ]));
    const derivedFields = stringArray(incomingMetadata.derivedFields)
      .filter((field) => !manualFields.includes(field));

    const mergedMetadata: Record<string, unknown> = {
      ...incomingMetadata,
      observedFields,
      derivedFields,
      ...(manualFields.length > 0 ? {
        manualObservation: existingMetadata.manualObservation,
        metricSeasonYear: manualObservation.metricSeasonYear ?? incomingMetadata.metricSeasonYear,
        seasonSelectionPolicy: 'FINAL_COLLEGE_SEASON',
        sourcesUsed: Array.from(new Set([
          ...stringArray(incomingMetadata.sourcesUsed),
          typeof manualObservation.sourceName === 'string' ? manualObservation.sourceName : 'Manual entry'
        ]))
      } : {})
    };

    const data = {
      prospectId,
      yprr: preserveManual('yprr') ? existing?.yprr ?? null : payload.metrics.yprr,
      pffOverallGrade: preserveManual('pffOverallGrade') ? existing?.pffOverallGrade ?? null : payload.metrics.pffOverallGrade,
      contestedCatchRate: preserveManual('contestedCatchRate') ? existing?.contestedCatchRate ?? null : payload.metrics.contestedCatchRate,
      behindLosTargetRate: preserveManual('behindLosTargetRate') ? existing?.behindLosTargetRate ?? null : payload.metrics.behindLosTargetRate,
      receptions: payload.metrics.receptions,
      targets: payload.metrics.targets,
      missedTacklesForcedPerReception: payload.metrics.missedTacklesForcedPerReception,
      yacAfterContactPerReception: payload.metrics.yacAfterContactPerReception,
      routesRun: payload.metrics.routesRun,
      gamesPlayed: payload.metrics.gamesPlayed,
      gamesMissed: payload.metrics.gamesMissed,
      competitionLevel: payload.metrics.competitionLevel,
      offensiveContextNotes: payload.metrics.offensiveContextNotes,
      qbPlayQuality: payload.metrics.qbPlayQuality,
      pffRank: payload.metrics.pffRank,
      yprrRank: payload.metrics.yprrRank,
      pressManWinRate: payload.metrics.pressManWinRate,
      releasePackageDepth: payload.metrics.releasePackageDepth,
      routeFamilyDiversity: payload.metrics.routeFamilyDiversity,
      alignmentFlexibilityIndex: payload.metrics.alignmentFlexibilityIndex,
      rolePortabilityIndex: payload.metrics.rolePortabilityIndex,
      usageAdaptabilityIndex: payload.metrics.usageAdaptabilityIndex,
      slotRate: payload.metrics.slotRate,
      wideRate: payload.metrics.wideRate,
      boundaryRate: payload.metrics.boundaryRate,
      sourceMetadataJson: toInputJson(mergedMetadata)
    };

    logger.debug('[PrismaB4MeWrMetricsWriteRepository] upsert start', {
      prospectId, existing: existing !== null, playerName: payload.playerName, manualFields
    });

    await this.prisma.b4MeWRMetrics.upsert({
      where: { prospectId },
      update: data,
      create: data
    });
  }

  public async saveManualObservedMetrics(input: ManualWrObservedMetricsInput): Promise<void> {
    const existing = await this.prisma.b4MeWRMetrics.findUnique({ where: { prospectId: input.prospectId } });
    const existingMetadata = jsonRecord(existing?.sourceMetadataJson ?? null);
    const sourceName = input.sourceName.trim();
    const manualObservation = {
      sourceType: 'MANUAL',
      fields: [...MANUAL_FIELDS],
      sourceName,
      sourceUrl: input.sourceUrl,
      notes: input.notes,
      enteredByPersonId: input.enteredByPersonId,
      enteredAt: new Date().toISOString(),
      metricSeasonYear: input.metricSeasonYear,
      seasonSelectionPolicy: 'FINAL_COLLEGE_SEASON'
    };

    const metadata: Record<string, unknown> = {
      ...existingMetadata,
      provider: 'MANUAL',
      observedFields: Array.from(new Set([
        ...stringArray(existingMetadata.observedFields),
        ...MANUAL_FIELDS
      ])),
      derivedFields: stringArray(existingMetadata.derivedFields)
        .filter((field) => !MANUAL_FIELDS.includes(field as typeof MANUAL_FIELDS[number])),
      sourcesUsed: Array.from(new Set([
        ...stringArray(existingMetadata.sourcesUsed),
        sourceName
      ])),
      metricSeasonYear: input.metricSeasonYear,
      seasonSelectionPolicy: 'FINAL_COLLEGE_SEASON',
      manualObservation
    };

    await this.prisma.b4MeWRMetrics.upsert({
      where: { prospectId: input.prospectId },
      update: {
        yprr: input.yprr,
        pffOverallGrade: input.pffOverallGrade,
        contestedCatchRate: input.contestedCatchRate,
        behindLosTargetRate: input.behindLosTargetRate,
        sourceMetadataJson: toInputJson(metadata)
      },
      create: {
        prospectId: input.prospectId,
        yprr: input.yprr,
        pffOverallGrade: input.pffOverallGrade,
        contestedCatchRate: input.contestedCatchRate,
        behindLosTargetRate: input.behindLosTargetRate,
        sourceMetadataJson: toInputJson(metadata)
      }
    });
  }
}
