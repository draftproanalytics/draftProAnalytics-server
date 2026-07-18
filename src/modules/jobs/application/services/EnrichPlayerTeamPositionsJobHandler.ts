import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IEspnDraftImportRepository } from '../../domain/repositories/IEspnDraftImportRepository';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { IEspnDraftProvider } from '../../domain/services/IEspnDraftProvider';
import { readEnrichPlayerTeamPositionsPayload } from './DpaJobPayloadGuards';

export class EnrichPlayerTeamPositionsJobHandler {
  public constructor(
    private readonly jobs: IJobQueueRepository,
    private readonly provider: IEspnDraftProvider,
    private readonly repository: IEspnDraftImportRepository,
  ) {}

  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readEnrichPlayerTeamPositionsPayload(job.payload);
    const step = await this.jobs.createJobStep({ jobId: job.id, stepName: 'ENRICH_PLAYER_TEAM_POSITIONS', sortOrder: 1 });
    await this.jobs.markStepRunning(step);

    const selections = await this.provider.fetchDraftSelections(payload.draftYear);
    let processed = 0; let updated = 0; let skipped = 0; let membershipNotFound = 0; let unmatchedPlayers = 0; let unmatchedTeams = 0;

    for (const selection of selections) {
      const result = await this.repository.enrichPlayerTeamPosition(selection, payload.overwriteExisting);
      processed += 1; updated += Number(result.positionUpdated); skipped += Number(result.positionSkipped);
      membershipNotFound += Number(!result.membershipFound && !result.unmatchedPlayer && !result.unmatchedTeam);
      unmatchedPlayers += Number(result.unmatchedPlayer); unmatchedTeams += Number(result.unmatchedTeam);

      if (result.unmatchedPlayer || result.unmatchedTeam || (!result.membershipFound && !result.unmatchedPlayer && !result.unmatchedTeam)) {
        await this.jobs.appendJobLog({ jobId: job.id, level: 'warn', message: 'PlayerTeam position could not be enriched.', contextJson: { draftYear: payload.draftYear, playerName: selection.playerName, athleteEspnId: selection.athleteEspnId, teamEspnId: selection.teamEspnId, unmatchedPlayer: result.unmatchedPlayer, unmatchedTeam: result.unmatchedTeam, membershipFound: result.membershipFound } as Prisma.InputJsonObject });
      }
      await this.jobs.updateJobProgress({ jobId: job.id, progressPercent: Math.min(99, Math.round((processed / Math.max(selections.length, 1)) * 100)), totalItems: selections.length, processedItems: processed });
    }

    const result = { draftYear: payload.draftYear, overwriteExisting: payload.overwriteExisting, selections: selections.length, processed, positionsUpdated: updated, positionsSkipped: skipped, membershipsNotFound: membershipNotFound, unmatchedPlayers, unmatchedTeams };
    await this.jobs.completeStep(step, result as Prisma.InputJsonObject);
    await this.jobs.completeJob({ jobId: job.id, resultCode: 'PLAYER_TEAM_POSITIONS_ENRICHED', resultJson: result as Prisma.InputJsonObject });
  }
}
