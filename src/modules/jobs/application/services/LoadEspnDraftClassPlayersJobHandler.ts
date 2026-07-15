import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IEspnDraftImportRepository } from '../../domain/repositories/IEspnDraftImportRepository';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { IEspnDraftProvider } from '../../domain/services/IEspnDraftProvider';
import { readEspnDraftYearPayload } from './DpaJobPayloadGuards';
export class LoadEspnDraftClassPlayersJobHandler {
  public constructor(private readonly jobs:IJobQueueRepository, private readonly provider:IEspnDraftProvider, private readonly repository:IEspnDraftImportRepository) {}
  public async execute(job:JobSummaryDto):Promise<void> {
    const {draftYear}=readEspnDraftYearPayload(job.payload);
    const step=await this.jobs.createJobStep({jobId:job.id,stepName:'FETCH_AND_UPSERT_ESPN_DRAFT_CLASS',sortOrder:1}); await this.jobs.markStepRunning(step);
    const athletes=await this.provider.fetchDraftClassAthletes(draftYear); let processed=0, espnCreated=0, playersCreated=0;
    for(const athlete of athletes){ const r=await this.repository.upsertDraftAthlete(athlete,draftYear); processed++; if(r.espnPlayerCreated)espnCreated++; if(r.playerCreated)playersCreated++;
      await this.jobs.updateJobProgress({jobId:job.id,progressPercent:Math.min(99,Math.round(processed/Math.max(athletes.length,1)*100)),totalItems:athletes.length,processedItems:processed}); }
    const result={draftYear,sourceAthletes:athletes.length,processed,espnPlayersCreated:espnCreated,playersCreated,playersUpdated:processed-playersCreated};
    await this.jobs.completeStep(step,result as Prisma.InputJsonObject); await this.jobs.completeJob({jobId:job.id,resultCode:'ESPN_DRAFT_CLASS_PLAYERS_IMPORTED',resultJson:result as Prisma.InputJsonObject});
  }
}
