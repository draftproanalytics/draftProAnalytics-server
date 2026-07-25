import { JobStatus } from '../../domain/enums/JobStatus.enum';
import { IJobRepository } from '../../domain/repositories/IJobRepository';
import { ListJobsResponseDto } from '../dto/Job.dto';
import { JobMapper } from '../mappers/JobMapper';

export interface ListJobsUseCaseRequest {
  readonly type?: string;
  readonly status?: JobStatus;
  readonly page: number;
  readonly pageSize: number;
}

export class ListJobsUseCase {
  public constructor(private readonly jobRepository: IJobRepository) {}

  public async execute(request: ListJobsUseCaseRequest): Promise<ListJobsResponseDto> {
    const result = await this.jobRepository.list(request);
    return {
      items: result.items.map(JobMapper.toListItem),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
}
