import type { Prisma } from '@prisma/client';
import type { EnrichPlayerTeamPositionsPayloadDto } from '../../domain/dtos/EspnDraftImport.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class EnqueueEnrichPlayerTeamPositionsJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}

  public execute(payload: EnrichPlayerTeamPositionsPayloadDto) {
    return this.jobs.enqueueJob({
      type: DpaJobType.EnrichPlayerTeamPositions,
      payload: payload as unknown as Prisma.InputJsonObject,
      requestedByPersonId: payload.requestedByPersonId,
    });
  }
}
