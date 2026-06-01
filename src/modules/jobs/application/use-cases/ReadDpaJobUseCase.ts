import type { JobLogDto, JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class ReadDpaJobUseCase {
  public constructor(private readonly jobQueueRepository: IJobQueueRepository) {}

  public async readJob(jobId: number): Promise<JobSummaryDto | null> {
    return this.jobQueueRepository.readJob(jobId);
  }

  public async readLogs(jobId: number): Promise<readonly JobLogDto[]> {
    return this.jobQueueRepository.readJobLogs(jobId);
  }
}
