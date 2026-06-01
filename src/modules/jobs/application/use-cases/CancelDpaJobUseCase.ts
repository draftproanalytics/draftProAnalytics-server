import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';

export class CancelDpaJobUseCase {
  public constructor(private readonly jobQueueRepository: IJobQueueRepository) {}

  public async execute(jobId: number, reason: string): Promise<void> {
    await this.jobQueueRepository.cancelJob(jobId, reason);
  }
}
