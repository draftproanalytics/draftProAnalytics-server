import type { ILiveWrProspectProvider } from '../../domain/repositories/ILiveWrProspectProvider';
import type { IProspectWriteRepository } from '../../domain/repositories/IProspectWriteRepository';
import type { IB4MeWrMetricsWriteRepository } from '../../domain/repositories/IB4MeWrMetricsWriteRepository';
import type { WrProspectRecord } from '../../domain/contracts/WrFramework.types';
import { logger } from '@/utils/Logger';

export class LiveWrProspectIntakeService {
  public constructor(
    private readonly liveProvider: ILiveWrProspectProvider,
    private readonly prospectWriteRepository: IProspectWriteRepository,
    private readonly wrMetricsWriteRepository: IB4MeWrMetricsWriteRepository
  ) {}

  public async getOrCreateFromLiveSource(
    playerName: string,
    draftYear: number | null
  ): Promise<WrProspectRecord | null> {
    logger.debug('[LiveWrProspectIntakeService] start', {
      playerName,
      draftYear
    });

    const livePayload = await this.liveProvider.findByPlayerName(playerName, draftYear);

    logger.debug('[LiveWrProspectIntakeService] provider result', {
      playerName,
      draftYear,
      found: livePayload !== null,
      resolvedPlayerName: livePayload?.playerName ?? null,
      sourceProvider: livePayload?.sourceMetadata.provider ?? null,
      sourcesUsed: livePayload?.sourceMetadata.sourcesUsed ?? []
    });

    if (livePayload === null) {
      return null;
    }

    const prospect = await this.prospectWriteRepository.upsertWideReceiverFromLivePayload(
      livePayload
    );

    logger.debug('[LiveWrProspectIntakeService] prospect upserted', {
      requestedPlayerName: playerName,
      resolvedPlayerName: prospect.playerName,
      prospectId: prospect.id,
      draftYear: prospect.draftYear
    });

    await this.wrMetricsWriteRepository.upsertFromLivePayload(prospect.id, livePayload);

    logger.debug('[LiveWrProspectIntakeService] metrics upsert complete', {
      prospectId: prospect.id,
      playerName: prospect.playerName
    });

    return prospect;
  }
}