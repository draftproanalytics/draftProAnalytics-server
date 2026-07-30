import type { Prisma } from '@prisma/client';
import type { GenerateTeamNeedsPayloadDto } from '../../domain/dtos/GenerateTeamNeeds.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class EnqueueGenerateTeamNeedsJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}

  public execute(payload: GenerateTeamNeedsPayloadDto) {
    return this.jobs.enqueueJob({
      type: DpaJobType.GenerateTeamNeeds,
      payload: payload as unknown as Prisma.InputJsonObject,
      requestedByPersonId: payload.requestedByPersonId,
    });
  }
}
