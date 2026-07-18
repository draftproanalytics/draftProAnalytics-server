import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { IPostSeasonResultSyncRepository } from '../../domain/repositories/IPostSeasonResultSyncRepository';
import { readSyncPostSeasonResultsPayload } from './DpaJobPayloadGuards';

export class SyncPostSeasonResultsJobHandler {
  public constructor(
    private readonly jobs: IJobQueueRepository,
    private readonly repository: IPostSeasonResultSyncRepository,
  ) {}

  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readSyncPostSeasonResultsPayload(job.payload);
    const stepId = await this.jobs.createJobStep({
      jobId: job.id,
      stepName: 'SYNC_POSTSEASON_RESULTS_FROM_GAMES',
      sortOrder: 1,
    });
    await this.jobs.markStepRunning(stepId);
    const result = await this.repository.syncFromGames(payload.seasonYear, payload.overwriteExisting);
    await this.jobs.updateJobProgress({
      jobId: job.id,
      progressPercent: 100,
      totalItems: result.teamsProcessed,
      processedItems: result.teamsProcessed,
    });
    await this.jobs.completeStep(stepId, result as unknown as Prisma.InputJsonObject);
    await this.jobs.completeJob({
      jobId: job.id,
      resultCode: 'POSTSEASON_RESULTS_SYNCED_FROM_GAMES',
      resultJson: result as unknown as Prisma.InputJsonObject,
    });
  }
}
