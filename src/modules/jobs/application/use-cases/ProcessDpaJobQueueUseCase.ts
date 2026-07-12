import type { ProcessJobQueueResultDto } from '../services/DpaJobQueueProcessor';
import type { DpaJobQueueProcessor } from '../services/DpaJobQueueProcessor';

export class ProcessDpaJobQueueUseCase {
  public constructor(private readonly dpaJobQueueProcessor: DpaJobQueueProcessor) {}

  public async execute(take: number): Promise<ProcessJobQueueResultDto> {
    const safeTake = Number.isInteger(take) && take > 0 ? Math.min(take, 25) : 1;
    return this.dpaJobQueueProcessor.processNextJobs(safeTake);
  }
}
