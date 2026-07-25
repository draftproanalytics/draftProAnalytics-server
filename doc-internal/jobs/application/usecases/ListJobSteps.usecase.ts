import { IJobStepRepository } from '../../domain/repositories/IJobStepRepository';
import { JobStepDto } from '../dto/Job.dto';
import { JobMapper } from '../mappers/JobMapper';

export class ListJobStepsUseCase {
  public constructor(private readonly jobStepRepository: IJobStepRepository) {}

  public async execute(jobId: number): Promise<readonly JobStepDto[]> {
    const steps = await this.jobStepRepository.listByJobId(jobId);
    return steps.map(JobMapper.toStepDto);
  }
}
