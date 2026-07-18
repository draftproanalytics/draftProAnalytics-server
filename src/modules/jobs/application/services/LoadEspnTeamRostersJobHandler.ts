import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { IEspnRosterImportRepository } from '../../domain/repositories/IEspnRosterImportRepository';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { IEspnRosterProvider } from '../../domain/services/IEspnRosterProvider';
import { readLoadEspnTeamRostersPayload } from './DpaJobPayloadGuards';

export class LoadEspnTeamRostersJobHandler {
  public constructor(
    private readonly jobs: IJobQueueRepository,
    private readonly provider: IEspnRosterProvider,
    private readonly repository: IEspnRosterImportRepository,
  ) {}

  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readLoadEspnTeamRostersPayload(job.payload);
    const stepId = await this.jobs.createJobStep({
      jobId: job.id,
      stepName: 'LOAD_ESPN_TEAM_ROSTERS',
      sortOrder: 1,
    });
    await this.jobs.markStepRunning(stepId);

    const teams = await this.repository.listImportTeams(payload.teamId);
    if (teams.length === 0) {
      throw new Error(payload.teamId === undefined
        ? 'No teams with espnTeamId were found.'
        : `Team ${payload.teamId} was not found or has no espnTeamId.`);
    }

    let teamsProcessed = 0;
    let athletesFetched = 0;
    let playersCreated = 0;
    let membershipsCreated = 0;
    let membershipsUpdated = 0;
    let priorMembershipsDeactivated = 0;
    let missingMembershipsDeactivated = 0;

    for (const team of teams) {
      const roster = await this.provider.fetchTeamRoster(team.espnTeamId, payload.seasonYear);
      const importedPlayerIds: number[] = [];

      for (const athlete of roster) {
        const result = await this.repository.upsertCurrentRosterAthlete(team, athlete, payload.seasonYear, payload.importMode);
        importedPlayerIds.push(result.playerId);
        athletesFetched += 1;
        playersCreated += Number(result.playerCreated);
        membershipsCreated += Number(result.membershipCreated);
        membershipsUpdated += Number(result.membershipUpdated);
        priorMembershipsDeactivated += result.priorMembershipsDeactivated;
      }

      if (payload.importMode === 'CURRENT' && payload.reconcileCurrentRoster) {
        missingMembershipsDeactivated += await this.repository.deactivateMissingCurrentMemberships(
          team.teamId,
          importedPlayerIds,
          payload.seasonYear,
        );
      }

      teamsProcessed += 1;
      await this.jobs.appendJobLog({
        jobId: job.id,
        level: 'info',
        message: `Imported ESPN roster for ${team.teamName}.`,
        contextJson: {
          teamId: team.teamId,
          espnTeamId: team.espnTeamId,
          seasonYear: payload.seasonYear,
          rosterCount: roster.length,
          importMode: payload.importMode,
          reconcileCurrentRoster: payload.reconcileCurrentRoster,
        } as Prisma.InputJsonObject,
      });
      await this.jobs.updateJobProgress({
        jobId: job.id,
        progressPercent: Math.min(99, Math.round((teamsProcessed / teams.length) * 100)),
        totalItems: teams.length,
        processedItems: teamsProcessed,
      });
    }

    const result = {
      seasonYear: payload.seasonYear,
      teamId: payload.teamId ?? null,
      importMode: payload.importMode,
      reconcileCurrentRoster: payload.reconcileCurrentRoster,
      teamsProcessed,
      athletesFetched,
      playersCreated,
      membershipsCreated,
      membershipsUpdated,
      priorMembershipsDeactivated,
      missingMembershipsDeactivated,
    };
    await this.jobs.completeStep(stepId, result as Prisma.InputJsonObject);
    await this.jobs.completeJob({
      jobId: job.id,
      resultCode: 'ESPN_TEAM_ROSTERS_LOADED',
      resultJson: result as Prisma.InputJsonObject,
    });
  }
}
