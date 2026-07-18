import type { Prisma } from '@prisma/client';
import type { SyncPostSeasonResultsPayloadDto } from '../../domain/dtos/PostSeasonResultSync.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class EnqueueSyncPostSeasonResultsJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}
  public execute(payload: SyncPostSeasonResultsPayloadDto) {
    return this.jobs.enqueueJob({
      type: DpaJobType.SyncPostSeasonResultsFromGames,
      payload: payload as unknown as Prisma.InputJsonObject,
      requestedByPersonId: payload.requestedByPersonId,
    });
  }
}
