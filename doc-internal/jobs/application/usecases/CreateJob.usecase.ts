import { IJobRepository } from '../../domain/repositories/IJobRepository';
import { JobDetailDto } from '../dto/Job.dto';
import { CreateJobRequestDto } from '../dto/CreateJobRequest.dto';
import { JobMapper } from '../mappers/JobMapper';

export class CreateJobUseCase {
  public constructor(private readonly jobRepository: IJobRepository) {}

  public async execute(request: CreateJobRequestDto): Promise<JobDetailDto> {
    const job = await this.jobRepository.create({
      type: request.type,
      payload: request.payload,
      requestedByPersonId: request.requestedByPersonId,
    });

    return JobMapper.toDetail(job);
  }
}
