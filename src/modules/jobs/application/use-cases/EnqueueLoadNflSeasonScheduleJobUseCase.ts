import type { Prisma } from '@prisma/client';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { LoadNflSeasonSchedulePayloadDto } from '../../domain/dtos/NflImportPayload.dto';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class EnqueueLoadNflSeasonScheduleJobUseCase {
  public constructor(private readonly jobQueueRepository: IJobQueueRepository) {}

  public async execute(payload: LoadNflSeasonSchedulePayloadDto): Promise<JobSummaryDto> {
    return this.jobQueueRepository.enqueueJob({
      type: DpaJobType.LoadNflSeasonSchedule,
      payload: payload as unknown as Prisma.InputJsonObject,
      requestedByPersonId: payload.requestedByPersonId,
    });
  }
}
