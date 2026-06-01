import type { Prisma } from '@prisma/client';
import { DpaJobType, executableDpaJobTypes } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { ImportNflGameScoresJobHandler } from './ImportNflGameScoresJobHandler';
import type { LoadNflSeasonScheduleJobHandler } from './LoadNflSeasonScheduleJobHandler';

export interface ProcessJobQueueResultDto {
  readonly claimed: number;
  readonly completed: number;
  readonly failed: number;
}

export class DpaJobQueueProcessor {
  public constructor(
    private readonly jobQueueRepository: IJobQueueRepository,
    private readonly loadNflSeasonScheduleJobHandler: LoadNflSeasonScheduleJobHandler,
    private readonly importNflGameScoresJobHandler: ImportNflGameScoresJobHandler,
  ) {}

  public async processNextJobs(take: number): Promise<ProcessJobQueueResultDto> {
    let claimed = 0;
    let completed = 0;
    let failed = 0;

    for (let index = 0; index < take; index += 1) {
      const job = await this.jobQueueRepository.claimNextExecutableJob(executableDpaJobTypes);

      if (!job) {
        break;
      }

      claimed += 1;

      try {
        await this.jobQueueRepository.markJobRunning(job.id);

        if (job.type === DpaJobType.LoadNflSeasonSchedule) {
          await this.loadNflSeasonScheduleJobHandler.execute(job);
        } else if (job.type === DpaJobType.ImportNflGameScores) {
          await this.importNflGameScoresJobHandler.execute(job);
        } else {
          throw new Error(`Unsupported job type: ${job.type}`);
        }

        completed += 1;
      } catch (error) {
        failed += 1;
        const errorMessage = error instanceof Error ? error.message : 'Unknown job processing error.';

        await this.jobQueueRepository.appendJobLog({
          jobId: job.id,
          level: 'error',
          message: errorMessage,
          contextJson: { type: job.type } as Prisma.InputJsonObject,
        });

        await this.jobQueueRepository.failJob({
          jobId: job.id,
          errorMessage,
          resultJson: { type: job.type } as Prisma.InputJsonObject,
        });
      }
    }

    return { claimed, completed, failed };
  }
}
