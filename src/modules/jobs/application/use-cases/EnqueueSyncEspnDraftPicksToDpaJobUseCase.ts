import type { Prisma } from '@prisma/client';
import type { SyncEspnDraftPicksToDpaPayloadDto } from '../../domain/dtos/EspnDraftImport.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class EnqueueSyncEspnDraftPicksToDpaJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}
  public execute(payload: SyncEspnDraftPicksToDpaPayloadDto) {
    return this.jobs.enqueueJob({ type: DpaJobType.SyncEspnDraftPicksToDpa, payload: payload as unknown as Prisma.InputJsonObject, requestedByPersonId: payload.requestedByPersonId });
  }
}
