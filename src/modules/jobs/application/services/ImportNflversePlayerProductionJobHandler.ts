import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { INflversePlayerProductionRepository } from '../../domain/repositories/INflversePlayerProductionRepository';
import type { INflversePlayerProductionProvider } from '../../domain/services/INflversePlayerProductionProvider';
import { readImportNflversePlayerProductionPayload } from './DpaJobPayloadGuards';
export class ImportNflversePlayerProductionJobHandler {
  public constructor(private readonly jobs: IJobQueueRepository, private readonly provider: INflversePlayerProductionProvider, private readonly repository: INflversePlayerProductionRepository) {}
  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readImportNflversePlayerProductionPayload(job.payload);
    const records = await this.provider.fetchSeason(payload.seasonYear, payload.summaryLevel);
    await this.jobs.updateJobProgress({ jobId: job.id, progressPercent: 40, totalItems: records.length, processedItems: 0 });
    const result = await this.repository.stage(job.id, payload.seasonYear, payload.summaryLevel, records, payload.teamId);
    await this.jobs.updateJobProgress({
      jobId: job.id,
      progressPercent: 95,
      totalItems: records.length,
      processedItems: result.staged,
    });
    await this.jobs.completeJob({ jobId: job.id, resultCode: 'NFLVERSE_PLAYER_PRODUCTION_STAGED', resultJson: { ...payload, ...result } as Prisma.InputJsonObject });
  }
}
