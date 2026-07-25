import { IJobRepository } from '../../domain/repositories/IJobRepository';
import { JobDetailDto } from '../dto/Job.dto';
import { JobMapper } from '../mappers/JobMapper';

export class GetJobUseCase {
  public constructor(private readonly jobRepository: IJobRepository) {}

  public async execute(id: number): Promise<JobDetailDto | null> {
    const job = await this.jobRepository.findById(id);
    return job === null ? null : JobMapper.toDetail(job);
  }
}
