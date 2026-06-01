import type { IJobRepository } from '../../domain/repositories/IJobRepository';
import type { IJobLogRepository } from '../../domain/repositories/IJobLogRepository';
import { WrImportOrchestratorService } from '../services/WrImportOrchestratorService';
import type {
  B4MeWrImportPlayerJobPayload,
  B4MeWrImportYearJobPayload
} from '../../domain/contracts/B4MeImportJobPayload';

type RunPayload = B4MeWrImportYearJobPayload | B4MeWrImportPlayerJobPayload;

export class RunWrImportJobUseCase {
  public constructor(
    private readonly jobRepository: IJobRepository,
    private readonly jobLogRepository: IJobLogRepository,
    private readonly orchestrator: WrImportOrchestratorService
  ) {}

  public async execute(jobId: number): Promise<{
    id: number;
    status: string;
    resultCode: string | null;
    resultJson: Record<string, unknown> | null;
  }> {
    const job = await this.jobRepository.findById(jobId);

    if (job === null) {
      throw new Error(`Job ${jobId} not found.`);
    }

    const payload = job.payload as RunPayload | null;

    if (payload === null) {
      throw new Error(`Job ${jobId} has no payload.`);
    }

    await this.markJobRunning(jobId);

    await this.jobLogRepository.create(
      jobId,
      'INFO',
      `Starting WR year import for ${payload.draftYear}.`
    );

    try {
      const summary = await this.orchestrator.run(jobId, payload);

      await this.markJobCompleted(jobId, 'OK', summary);

      return {
        id: jobId,
        status: 'completed',
        resultCode: 'OK',
        resultJson: summary as unknown as Record<string, unknown>
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown job failure';

      await this.jobLogRepository.create(jobId, 'ERROR', message);
      await this.markJobFailed(jobId, 'ERROR', message);

      return {
        id: jobId,
        status: 'failed',
        resultCode: 'ERROR',
        resultJson: { message }
      };
    }
  }

  private async markJobRunning(jobId: number): Promise<void> {
    const repository = this.jobRepository as unknown as {
      markRunning?: (jobId: number) => Promise<void>;
      markStarted?: (jobId: number) => Promise<void>;
    };

    if (typeof repository.markRunning === 'function') {
      await repository.markRunning(jobId);
      return;
    }

    if (typeof repository.markStarted === 'function') {
      await repository.markStarted(jobId);
    }
  }

  private async markJobCompleted(
    jobId: number,
    resultCode: string,
    resultJson: unknown
  ): Promise<void> {
    const repository = this.jobRepository as unknown as {
      markCompleted?: (jobId: number, resultCode: string, resultJson: unknown) => Promise<void>;
    };

    if (typeof repository.markCompleted === 'function') {
      await repository.markCompleted(jobId, resultCode, resultJson);
    }
  }

  private async markJobFailed(
    jobId: number,
    resultCode: string,
    message: string
  ): Promise<void> {
    const repository = this.jobRepository as unknown as {
      markFailed?: (jobId: number, resultCode: string, result: string) => Promise<void>;
    };

    if (typeof repository.markFailed === 'function') {
      await repository.markFailed(jobId, resultCode, message);
    }
  }
}