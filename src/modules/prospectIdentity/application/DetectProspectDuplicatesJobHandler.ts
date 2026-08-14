import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '@/modules/jobs/domain/dtos/JobSummary.dto';
import type { IJobQueueRepository } from '@/modules/jobs/domain/repositories/IJobQueueRepository';
import type { IProspectIdentityRepository } from '../domain/IProspectIdentityRepository';

export class DetectProspectDuplicatesJobHandler {
  public constructor(private readonly jobs: IJobQueueRepository, private readonly identities: IProspectIdentityRepository) {}
  public async execute(job: JobSummaryDto): Promise<void> {
    await this.jobs.appendJobLog({ jobId: job.id, level: 'info', message: 'Scanning Prospect rows for deterministic duplicate candidates.' });
    const result = await this.identities.detectDuplicateCandidates();
    await this.jobs.updateJobProgress({ jobId: job.id, progressPercent: 100, totalItems: result.scanned, processedItems: result.scanned });
    await this.jobs.completeJob({ jobId: job.id, resultCode: 'PROSPECT_DUPLICATE_SCAN_COMPLETE', resultJson: result as unknown as Prisma.InputJsonObject });
  }
}
