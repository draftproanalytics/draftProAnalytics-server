import type { Job_status } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export interface ListDpaJobsQueryDto {
  readonly status?: Job_status;
  readonly type?: string;
  readonly limit: number;
}

export class ListDpaJobsUseCase {
  public constructor(private readonly jobQueueRepository: IJobQueueRepository) {}

  public async execute(query: ListDpaJobsQueryDto): Promise<readonly JobSummaryDto[]> {
    return this.jobQueueRepository.listJobs(query);
  }
}
