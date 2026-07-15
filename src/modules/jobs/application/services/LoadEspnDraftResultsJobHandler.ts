import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IEspnDraftImportRepository } from '../../domain/repositories/IEspnDraftImportRepository';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { IEspnDraftProvider } from '../../domain/services/IEspnDraftProvider';
import { readEspnDraftResultsPayload } from './DpaJobPayloadGuards';

export class LoadEspnDraftResultsJobHandler {
  public constructor(
    private readonly jobs: IJobQueueRepository,
    private readonly provider: IEspnDraftProvider,
    private readonly repository: IEspnDraftImportRepository,
  ) {}

  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readEspnDraftResultsPayload(job.payload);
    const step = await this.jobs.createJobStep({
      jobId: job.id,
      stepName: 'FETCH_AND_APPLY_ESPN_DRAFT_RESULTS',
      sortOrder: 1,
    });
    await this.jobs.markStepRunning(step);

    const selections = await this.provider.fetchDraftSelections(payload.draftYear);
    let processed = 0;
    let rawCreated = 0;
    let dpaUpdated = 0;
    let membershipCreated = 0;
    let membershipUpdated = 0;
    let unmatchedPlayers = 0;
    let unmatchedTeams = 0;
    let conflicts = 0;

    for (const selection of selections) {
      const result = await this.repository.importDraftSelection(selection, payload.activateMembership);
      processed += 1;
      rawCreated += Number(result.rawDraftPickCreated);
      dpaUpdated += Number(result.dpaDraftPickUpdated);
      membershipCreated += Number(result.membershipCreated);
      membershipUpdated += Number(result.membershipUpdated);
      unmatchedPlayers += Number(result.unmatchedPlayer);
      unmatchedTeams += Number(result.unmatchedTeam);
      conflicts += Number(result.activeMembershipConflict);

      if (result.unmatchedPlayer || result.unmatchedTeam || result.activeMembershipConflict) {
        await this.jobs.appendJobLog({
          jobId: job.id,
          level: 'warn',
          message: 'Draft selection requires review.',
          contextJson: {
            overallPick: selection.overallPick,
            playerName: selection.playerName,
            athleteEspnId: selection.athleteEspnId,
            teamEspnId: selection.teamEspnId,
            unmatchedPlayer: result.unmatchedPlayer,
            unmatchedTeam: result.unmatchedTeam,
            activeMembershipConflict: result.activeMembershipConflict,
          } as Prisma.InputJsonObject,
        });
      }

      await this.jobs.updateJobProgress({
        jobId: job.id,
        progressPercent: Math.min(99, Math.round((processed / Math.max(selections.length, 1)) * 100)),
        totalItems: selections.length,
        processedItems: processed,
      });
    }

    const result = {
      draftYear: payload.draftYear,
      activateMembership: payload.activateMembership,
      selections: selections.length,
      processed,
      rawDraftPicksCreated: rawCreated,
      rawDraftPicksUpdated: processed - rawCreated,
      dpaDraftPicksUpdated: dpaUpdated,
      membershipsCreated: membershipCreated,
      membershipsUpdated: membershipUpdated,
      unmatchedPlayers,
      unmatchedTeams,
      activeMembershipConflicts: conflicts,
    };

    await this.jobs.completeStep(step, result as Prisma.InputJsonObject);
    await this.jobs.completeJob({
      jobId: job.id,
      resultCode: 'ESPN_DRAFT_RESULTS_IMPORTED',
      resultJson: result as Prisma.InputJsonObject,
    });
  }
}
