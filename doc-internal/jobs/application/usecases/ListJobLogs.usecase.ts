import { IJobLogRepository } from '../../domain/repositories/IJobLogRepository';
import { JobLogDto } from '../dto/Job.dto';
import { JobMapper } from '../mappers/JobMapper';

export class ListJobLogsUseCase {
  public constructor(private readonly jobLogRepository: IJobLogRepository) {}

  public async execute(jobId: number): Promise<readonly JobLogDto[]> {
    const logs = await this.jobLogRepository.listByJobId(jobId);
    return logs.map(JobMapper.toLogDto);
  }
}
