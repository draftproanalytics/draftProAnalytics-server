import type { Prisma } from '@prisma/client';
import type { EvaluateB4MeWrProspectsPayloadDto } from '../../domain/dtos/B4MeWrEvaluation.dto';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class EnqueueEvaluateB4MeWrProspectsJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}

  public execute(payload: EvaluateB4MeWrProspectsPayloadDto) {
    return this.jobs.enqueueJob({
      type: DpaJobType.EvaluateB4MeWrProspects,
      payload: payload as unknown as Prisma.InputJsonObject,
      requestedByPersonId: payload.requestedByPersonId,
    });
  }
}
