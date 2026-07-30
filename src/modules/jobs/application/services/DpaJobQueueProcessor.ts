import type { Prisma } from '@prisma/client';
import { DpaJobType, executableDpaJobTypes } from '../../domain/enums/DpaJobType';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { ImportNflGameScoresJobHandler } from './ImportNflGameScoresJobHandler';
import type { LoadNflSeasonScheduleJobHandler } from './LoadNflSeasonScheduleJobHandler';
import type { LoadEspnDraftClassPlayersJobHandler } from './LoadEspnDraftClassPlayersJobHandler';
import type { LoadEspnDraftResultsJobHandler } from './LoadEspnDraftResultsJobHandler';
import type { EnrichPlayerTeamPositionsJobHandler } from './EnrichPlayerTeamPositionsJobHandler';
import type { SyncEspnDraftPicksToDpaJobHandler } from './SyncEspnDraftPicksToDpaJobHandler';
import type { LoadEspnTeamRostersJobHandler } from './LoadEspnTeamRostersJobHandler';
import type { SyncPostSeasonResultsJobHandler } from './SyncPostSeasonResultsJobHandler';
import type { GenerateTeamNeedsJobHandler } from './GenerateTeamNeedsJobHandler';

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
    private readonly loadEspnDraftClassPlayersJobHandler: LoadEspnDraftClassPlayersJobHandler,
    private readonly loadEspnDraftResultsJobHandler: LoadEspnDraftResultsJobHandler,
    private readonly enrichPlayerTeamPositionsJobHandler: EnrichPlayerTeamPositionsJobHandler,
    private readonly syncEspnDraftPicksToDpaJobHandler: SyncEspnDraftPicksToDpaJobHandler,
    private readonly loadEspnTeamRostersJobHandler: LoadEspnTeamRostersJobHandler,
    private readonly syncPostSeasonResultsJobHandler: SyncPostSeasonResultsJobHandler,
    private readonly generateTeamNeedsJobHandler: GenerateTeamNeedsJobHandler,
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
        } else if (job.type === DpaJobType.LoadEspnDraftClassPlayers) {
          await this.loadEspnDraftClassPlayersJobHandler.execute(job);
        } else if (job.type === DpaJobType.LoadEspnDraftResults) {
          await this.loadEspnDraftResultsJobHandler.execute(job);
        } else if (job.type === DpaJobType.EnrichPlayerTeamPositions) {
          await this.enrichPlayerTeamPositionsJobHandler.execute(job);
        } else if (job.type === DpaJobType.SyncEspnDraftPicksToDpa) {
          await this.syncEspnDraftPicksToDpaJobHandler.execute(job);
        } else if (job.type === DpaJobType.LoadEspnTeamRosters) {
          await this.loadEspnTeamRostersJobHandler.execute(job);
        } else if (job.type === DpaJobType.SyncPostSeasonResultsFromGames) {
          await this.syncPostSeasonResultsJobHandler.execute(job);
        } else if (job.type === DpaJobType.GenerateTeamNeeds) {
          await this.generateTeamNeedsJobHandler.execute(job);
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
