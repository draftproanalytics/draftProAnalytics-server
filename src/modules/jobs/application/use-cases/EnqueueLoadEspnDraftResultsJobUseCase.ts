import type { Prisma } from '@prisma/client';
import type { EspnDraftResultsPayloadDto } from '../../domain/dtos/EspnDraftImport.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
export class EnqueueLoadEspnDraftResultsJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}
  public execute(payload: EspnDraftResultsPayloadDto) { return this.jobs.enqueueJob({ type: DpaJobType.LoadEspnDraftResults, payload: payload as unknown as Prisma.InputJsonObject, requestedByPersonId: payload.requestedByPersonId }); }
}
