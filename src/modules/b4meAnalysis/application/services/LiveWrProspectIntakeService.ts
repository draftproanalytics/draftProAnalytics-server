import type { ILiveWrProspectProvider } from '../../domain/repositories/ILiveWrProspectProvider';
import type { IProspectWriteRepository } from '../../domain/repositories/IProspectWriteRepository';
import type { IB4MeWrMetricsWriteRepository } from '../../domain/repositories/IB4MeWrMetricsWriteRepository';
import type { WrProspectRecord } from '../../domain/contracts/WrFramework.types';
import { logger } from '@/utils/Logger';
import type { IProspectIdentityRepository } from '@/modules/prospectIdentity/domain/IProspectIdentityRepository';
import { normalizeProspectName, scoreProviderNameMatch } from '@/modules/prospectIdentity/application/ProspectDuplicateScoringService';

export class LiveWrProspectIntakeService {
  public constructor(
    private readonly liveProvider: ILiveWrProspectProvider,
    private readonly prospectWriteRepository: IProspectWriteRepository,
    private readonly wrMetricsWriteRepository: IB4MeWrMetricsWriteRepository,
    private readonly identityRepository: IProspectIdentityRepository
  ) {}

  public async getOrCreateFromLiveSource(
    playerName: string,
    draftYear: number | null,
    requestedProspectId: number | null = null
  ): Promise<WrProspectRecord | null> {
    logger.debug('[LiveWrProspectIntakeService] start', {
      playerName,
      draftYear
    });

    if (requestedProspectId !== null && await this.identityRepository.hasOpenIdentityIssue(requestedProspectId)) {
      logger.debug('[LiveWrProspectIntakeService] skipped: unresolved identity review', { prospectId: requestedProspectId });
      return null;
    }

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

    const requestedNormalized = normalizeProspectName(playerName);
    const resolvedNormalized = normalizeProspectName(livePayload.playerName);
    const confidenceScore = scoreProviderNameMatch(playerName, livePayload.playerName);

    if (requestedNormalized !== resolvedNormalized) {
      await this.identityRepository.createIdentityReview({
        prospectId: requestedProspectId,
        provider: livePayload.sourceMetadata.provider,
        requestedName: playerName,
        resolvedName: livePayload.playerName,
        confidenceScore,
        reason: 'LOW_CONFIDENCE_PROVIDER_MATCH',
        providerPayloadJson: livePayload as unknown as import('@prisma/client').Prisma.InputJsonValue,
      });
      logger.warn('[LiveWrProspectIntakeService] provider identity mismatch; hydration skipped', {
        requestedProspectId, requestedPlayerName: playerName, resolvedPlayerName: livePayload.playerName, confidenceScore,
      });
      return null;
    }

    if (requestedProspectId !== null) {
      await this.wrMetricsWriteRepository.upsertFromLivePayload(requestedProspectId, livePayload);
      logger.debug('[LiveWrProspectIntakeService] metrics written to requested Prospect only', { prospectId: requestedProspectId, playerName });
      return { id: requestedProspectId, playerName, school: livePayload.school, draftYear, position: 'WR' };
    }

    const prospect = await this.prospectWriteRepository.upsertWideReceiverFromLivePayload(livePayload);
    await this.wrMetricsWriteRepository.upsertFromLivePayload(prospect.id, livePayload);
    return prospect;
  }
}