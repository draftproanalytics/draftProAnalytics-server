import type { IJobQueueRepository } from '@/modules/jobs/domain/repositories/IJobQueueRepository';
import { DpaJobType } from '@/modules/jobs/domain/enums/DpaJobType';
export class EnqueueDetectProspectDuplicatesJobUseCase {
  public constructor(private readonly jobs: IJobQueueRepository) {}
  public execute(requestedByPersonId: number | null) {
    return this.jobs.enqueueJob({ type: DpaJobType.DetectProspectDuplicates, payload: {}, requestedByPersonId: requestedByPersonId ?? undefined });
  }
}
