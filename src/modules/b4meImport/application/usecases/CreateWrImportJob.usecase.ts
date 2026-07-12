import type {
  B4MeImportJobPayload
} from '../../domain/contracts/B4MeImportJobPayload';
import type { IJobRepository, JobRecord } from '../../domain/repositories/IJobRepository';

export class CreateWrImportJobUseCase {
  public constructor(private readonly jobRepository: IJobRepository) {}

  public async execute(type: string, payload: B4MeImportJobPayload): Promise<JobRecord> {
    return this.jobRepository.create(type, payload);
  }
}
