import type { Prisma } from '@prisma/client';
import { DpaJobStepName } from '../../domain/enums/DpaJobStepName';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IGameScheduleRepository } from '../../domain/repositories/IGameScheduleRepository';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { INflScheduleProvider } from '../../domain/services/INflScheduleProvider';
import { readImportNflGameScoresPayload } from './DpaJobPayloadGuards';
import { toNflProviderWeek } from '../../domain/value-objects/NflSeasonType';

export class ImportNflGameScoresJobHandler {
  public constructor(
    private readonly jobQueueRepository: IJobQueueRepository,
    private readonly nflScheduleProvider: INflScheduleProvider,
    private readonly gameScheduleRepository: IGameScheduleRepository,
  ) {}

  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readImportNflGameScoresPayload(job.payload);

    await this.jobQueueRepository.appendJobLog({
      jobId: job.id,
      level: 'info',
      message: 'Starting NFL weekly game score import.',
      contextJson: payload as unknown as Prisma.InputJsonObject,
    });

    const fetchStepId = await this.jobQueueRepository.createJobStep({
      jobId: job.id,
      stepName: DpaJobStepName.FetchNflEvents,
      sortOrder: 1,
      totalItems: 1,
    });

    await this.jobQueueRepository.markStepRunning(fetchStepId);

    const events = await this.nflScheduleProvider.fetchWeekEvents({
      seasonYear: payload.seasonYear,
      seasonType: payload.seasonType,
      week: toNflProviderWeek(payload.seasonType, payload.week),
    });

    const result = await this.gameScheduleRepository.upsertImportedGames(events);

    await this.jobQueueRepository.updateJobProgress({
      jobId: job.id,
      progressPercent: 100,
      totalItems: events.length,
      processedItems: result.insertedOrUpdated,
    });

    await this.jobQueueRepository.completeStep(fetchStepId, {
      fetchedEvents: events.length,
      insertedOrUpdated: result.insertedOrUpdated,
      skipped: result.skipped,
    } as Prisma.InputJsonObject);

    await this.jobQueueRepository.completeJob({
      jobId: job.id,
      resultCode: 'NFL_GAME_SCORES_IMPORTED',
      resultJson: {
        seasonYear: payload.seasonYear,
        seasonType: payload.seasonType,
        week: payload.week,
        fetchedEvents: events.length,
        insertedOrUpdated: result.insertedOrUpdated,
        skipped: result.skipped,
        skippedReasons: result.skippedReasons.slice(0, 50),
      } as Prisma.InputJsonObject,
    });
  }
}
