import type { Prisma, PrismaClient } from '@prisma/client';
import type { IB4MeWrMetricsWriteRepository } from '../../domain/repositories/IB4MeWrMetricsWriteRepository';
import type { LiveWrProspectPayload } from '../../domain/contracts/LiveWrProspect.types';
import { logger } from '@/utils/Logger';

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export class PrismaB4MeWrMetricsWriteRepository implements IB4MeWrMetricsWriteRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async upsertFromLivePayload(
    prospectId: number,
    payload: LiveWrProspectPayload
  ): Promise<void> {
    const existing = await this.prisma.b4MeWRMetrics.findUnique({
      where: {
        prospectId
      }
    });

    const data = {
      prospectId,
      yprr: payload.metrics.yprr,
      pffOverallGrade: payload.metrics.pffOverallGrade,
      contestedCatchRate: payload.metrics.contestedCatchRate,
      behindLosTargetRate: payload.metrics.behindLosTargetRate,
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
      sourceMetadataJson: toInputJson(payload.sourceMetadata)
    };

    logger.debug('[PrismaB4MeWrMetricsWriteRepository] upsert start', {
      prospectId,
      existing: existing !== null,
      playerName: payload.playerName,
      receptions: payload.metrics.receptions,
      targets: payload.metrics.targets,
      gamesPlayed: payload.metrics.gamesPlayed,
      gamesMissed: payload.metrics.gamesMissed
    });

    if (existing) {
      await this.prisma.b4MeWRMetrics.update({
        where: { prospectId },
        data
      });

      logger.debug('[PrismaB4MeWrMetricsWriteRepository] update complete', {
        prospectId
      });
      return;
    }

    await this.prisma.b4MeWRMetrics.create({
      data
    });

    logger.debug('[PrismaB4MeWrMetricsWriteRepository] create complete', {
      prospectId
    });
  }
}