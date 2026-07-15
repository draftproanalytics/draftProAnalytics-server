import type { Prisma } from '@prisma/client';
import type { EspnDraftYearPayloadDto } from '../../domain/dtos/EspnDraftImport.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
export class EnqueueLoadEspnDraftClassPlayersJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}
  public execute(payload: EspnDraftYearPayloadDto) { return this.jobs.enqueueJob({ type: DpaJobType.LoadEspnDraftClassPlayers, payload: payload as unknown as Prisma.InputJsonObject, requestedByPersonId: payload.requestedByPersonId }); }
}
