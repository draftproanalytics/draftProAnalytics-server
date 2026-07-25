import { JobStatus } from '../../domain/enums/JobStatus.enum';
import { IJobRepository } from '../../domain/repositories/IJobRepository';
import { JobDetailDto } from '../dto/Job.dto';
import { JobMapper } from '../mappers/JobMapper';

export class CancelJobUseCase {
  public constructor(private readonly jobRepository: IJobRepository) {}

  public async execute(id: number, cancelReason: string): Promise<JobDetailDto> {
    const job = await this.jobRepository.findById(id);
    if (job === null) {
      throw new Error(`Job ${id.toString()} was not found.`);
    }

    if (job.status === JobStatus.Completed || job.status === JobStatus.Failed || job.status === JobStatus.Canceled) {
      throw new Error(`Job ${id.toString()} cannot be cancelled because it is ${job.status}.`);
    }

    const cancelled = await this.jobRepository.markCanceled(id, cancelReason);
    return JobMapper.toDetail(cancelled);
  }
}
