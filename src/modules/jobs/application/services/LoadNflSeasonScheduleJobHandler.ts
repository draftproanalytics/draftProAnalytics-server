import type { Prisma } from '@prisma/client';
import { DpaJobStepName } from '../../domain/enums/DpaJobStepName';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IGameScheduleRepository } from '../../domain/repositories/IGameScheduleRepository';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { INflScheduleProvider } from '../../domain/services/INflScheduleProvider';
import { getWeeksForSeasonType } from '../../domain/value-objects/NflSeasonType';
import { readLoadNflSeasonSchedulePayload } from './DpaJobPayloadGuards';

export class LoadNflSeasonScheduleJobHandler {
  public constructor(
    private readonly jobQueueRepository: IJobQueueRepository,
    private readonly nflScheduleProvider: INflScheduleProvider,
    private readonly gameScheduleRepository: IGameScheduleRepository,
  ) {}

  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readLoadNflSeasonSchedulePayload(job.payload);
    const weeksToImport = payload.seasonTypes.flatMap((seasonType) =>
      getWeeksForSeasonType(seasonType).map((week) => ({ seasonType, week })),
    );

    await this.jobQueueRepository.appendJobLog({
      jobId: job.id,
      level: 'info',
      message: 'Starting NFL season schedule import.',
      contextJson: {
        seasonYear: payload.seasonYear,
        seasonTypes: [...payload.seasonTypes],
        weekCount: weeksToImport.length,
      } as Prisma.InputJsonObject,
    });

    const fetchStepId = await this.jobQueueRepository.createJobStep({
      jobId: job.id,
      stepName: DpaJobStepName.FetchNflEvents,
      sortOrder: 1,
      totalItems: weeksToImport.length,
    });

    await this.jobQueueRepository.markStepRunning(fetchStepId);

    let processedWeeks = 0;
    let importedGames = 0;
    let skippedGames = 0;
    const skippedReasons: string[] = [];

    for (const weekToImport of weeksToImport) {
      const events = await this.nflScheduleProvider.fetchWeekEvents({
        seasonYear: payload.seasonYear,
        seasonType: weekToImport.seasonType,
        week: weekToImport.week,
      });

      const result = await this.gameScheduleRepository.upsertImportedGames(events);
      importedGames += result.insertedOrUpdated;
      skippedGames += result.skipped;
      skippedReasons.push(...result.skippedReasons);

      processedWeeks += 1;

      await this.jobQueueRepository.updateJobProgress({
        jobId: job.id,
        progressPercent: Math.min(99, Math.round((processedWeeks / weeksToImport.length) * 100)),
        totalItems: weeksToImport.length,
        processedItems: processedWeeks,
      });

      await this.jobQueueRepository.appendJobLog({
        jobId: job.id,
        level: 'info',
        message: 'Imported NFL schedule week.',
        contextJson: {
          seasonYear: payload.seasonYear,
          seasonType: weekToImport.seasonType,
          week: weekToImport.week,
          fetchedEvents: events.length,
          insertedOrUpdated: result.insertedOrUpdated,
          skipped: result.skipped,
        } as Prisma.InputJsonObject,
      });
    }

    await this.jobQueueRepository.completeStep(fetchStepId, {
      processedWeeks,
      importedGames,
      skippedGames,
    } as Prisma.InputJsonObject);

    await this.jobQueueRepository.completeJob({
      jobId: job.id,
      resultCode: 'NFL_SEASON_SCHEDULE_IMPORTED',
      resultJson: {
        seasonYear: payload.seasonYear,
        processedWeeks,
        importedGames,
        skippedGames,
        skippedReasons: skippedReasons.slice(0, 50),
      } as Prisma.InputJsonObject,
    });
  }
}
