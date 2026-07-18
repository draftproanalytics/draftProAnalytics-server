import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IEspnDraftImportRepository } from '../../domain/repositories/IEspnDraftImportRepository';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import { readSyncEspnDraftPicksToDpaPayload } from './DpaJobPayloadGuards';

export class SyncEspnDraftPicksToDpaJobHandler {
  public constructor(private readonly jobs: IJobQueueRepository, private readonly repository: IEspnDraftImportRepository) {}
  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readSyncEspnDraftPicksToDpaPayload(job.payload);
    const step = await this.jobs.createJobStep({ jobId: job.id, stepName: 'SYNC_ESPN_DRAFT_PICKS_TO_DPA', sortOrder: 1 });
    await this.jobs.markStepRunning(step);
    const result = await this.repository.syncEspnDraftPicksToDpa(payload.draftYear, payload.overwriteExisting);
    await this.jobs.updateJobProgress({ jobId: job.id, progressPercent: 100, totalItems: result.sourceRows, processedItems: result.sourceRows });
    if (result.unmatchedPlayers > 0 || result.unmatchedTeams > 0 || result.invalidRows > 0) {
      await this.jobs.appendJobLog({ jobId: job.id, level: 'warn', message: 'Some ESPN draft picks could not be synchronized.', contextJson: result as unknown as Prisma.InputJsonObject });
    }
    await this.jobs.completeStep(step, result as unknown as Prisma.InputJsonObject);
    await this.jobs.completeJob({ jobId: job.id, resultCode: 'ESPN_DRAFT_PICKS_SYNCED_TO_DPA', resultJson: result as unknown as Prisma.InputJsonObject });
  }
}
