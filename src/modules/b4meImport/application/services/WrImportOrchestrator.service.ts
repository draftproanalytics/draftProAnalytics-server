import type {
  B4MeImportJobPayload,
  B4MeImportResultSummary,
  B4MeWrImportPlayerJobPayload,
  B4MeWrImportYearJobPayload
} from '../../domain/contracts/B4MeImportJobPayload';
import type { ILiveWrProspectListProvider } from '../../domain/repositories/ILiveWrProspectListProvider';
import type { IJobLogRepository } from '../../domain/repositories/IJobLogRepository';
import { LiveWrProspectIntakeService } from '../../../b4meAnalysis/application/services/LiveWrProspectIntakeService';
import { WrEvaluationBatchService } from './WrEvaluationBatchService';

export class WrImportOrchestratorService {
  public constructor(
    private readonly listProvider: ILiveWrProspectListProvider,
    private readonly liveWrProspectIntakeService: LiveWrProspectIntakeService,
    private readonly evaluationBatchService: WrEvaluationBatchService,
    private readonly jobLogRepository: IJobLogRepository
  ) {}

  public async run(jobId: number, payload: B4MeImportJobPayload): Promise<B4MeImportResultSummary> {
    if ('playerName' in payload) {
      return this.runPlayerImport(jobId, payload);
    }

    return this.runYearImport(jobId, payload);
  }

  private async runYearImport(
    jobId: number,
    payload: B4MeWrImportYearJobPayload
  ): Promise<B4MeImportResultSummary> {
    await this.jobLogRepository.create(
      jobId,
      'INFO',
      `Starting WR year import for ${payload.draftYear}.`
    );

    const candidates = await this.listProvider.listByDraftYear(payload.draftYear);

    await this.jobLogRepository.create(
      jobId,
      'INFO',
      `Found ${candidates.length} WR import candidates for ${payload.draftYear}.`
    );

    let prospectsUpserted = 0;
    let metricsUpserted = 0;
    let evaluationsCreated = 0;
    let playersSkipped = 0;
    const errors: Array<{ playerName: string; reason: string }> = [];

    for (const candidate of candidates) {
      try {
        const prospect = await this.liveWrProspectIntakeService.getOrCreateFromLiveSource(
          candidate.playerName,
          candidate.draftYear
        );

        if (prospect === null) {
          playersSkipped += 1;
          errors.push({
            playerName: candidate.playerName,
            reason: 'No live payload found.'
          });

          await this.jobLogRepository.create(
            jobId,
            'WARN',
            `Skipped ${candidate.playerName}: no live payload found.`
          );
          continue;
        }

        prospectsUpserted += 1;
        metricsUpserted += 1;

        await this.jobLogRepository.create(
          jobId,
          'INFO',
          `Hydrated ${prospect.playerName} (prospectId=${prospect.id}).`
        );

        if (payload.recomputeEvaluations) {
          const created = await this.evaluationBatchService.recomputePlayer(
            prospect.playerName,
            prospect.draftYear,
            payload.scoringModes
          );

          evaluationsCreated += created;

          await this.jobLogRepository.create(
            jobId,
            'INFO',
            `Computed ${created} evaluation row(s) for ${prospect.playerName}.`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown import error';
        errors.push({
          playerName: candidate.playerName,
          reason: message
        });

        await this.jobLogRepository.create(
          jobId,
          'ERROR',
          `Failed importing ${candidate.playerName}: ${message}`
        );
      }
    }

    return {
      positionGroup: 'WR',
      draftYear: payload.draftYear,
      playerName: null,
      totalCandidatesSeen: candidates.length,
      prospectsUpserted,
      metricsUpserted,
      evaluationsCreated,
      playersSkipped,
      errors
    };
  }

  private async runPlayerImport(
    jobId: number,
    payload: B4MeWrImportPlayerJobPayload
  ): Promise<B4MeImportResultSummary> {
    await this.jobLogRepository.create(
      jobId,
      'INFO',
      `Starting WR player import for ${payload.playerName}.`
    );

    let prospectsUpserted = 0;
    let metricsUpserted = 0;
    let evaluationsCreated = 0;
    let playersSkipped = 0;
    const errors: Array<{ playerName: string; reason: string }> = [];

    try {
      const prospect = await this.liveWrProspectIntakeService.getOrCreateFromLiveSource(
        payload.playerName,
        payload.draftYear
      );

      if (prospect === null) {
        playersSkipped = 1;
        errors.push({
          playerName: payload.playerName,
          reason: 'No live payload found.'
        });

        await this.jobLogRepository.create(
          jobId,
          'WARN',
          `Skipped ${payload.playerName}: no live payload found.`
        );

        return {
          positionGroup: 'WR',
          draftYear: payload.draftYear,
          playerName: payload.playerName,
          totalCandidatesSeen: 1,
          prospectsUpserted,
          metricsUpserted,
          evaluationsCreated,
          playersSkipped,
          errors
        };
      }

      prospectsUpserted = 1;
      metricsUpserted = 1;

      await this.jobLogRepository.create(
        jobId,
        'INFO',
        `Hydrated ${prospect.playerName} (prospectId=${prospect.id}).`
      );

      if (payload.recomputeEvaluations) {
        evaluationsCreated = await this.evaluationBatchService.recomputePlayer(
          prospect.playerName,
          prospect.draftYear,
          payload.scoringModes
        );

        await this.jobLogRepository.create(
          jobId,
          'INFO',
          `Computed ${evaluationsCreated} evaluation row(s) for ${prospect.playerName}.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown import error';
      errors.push({
        playerName: payload.playerName,
        reason: message
      });

      await this.jobLogRepository.create(
        jobId,
        'ERROR',
        `Failed importing ${payload.playerName}: ${message}`
      );
    }

    return {
      positionGroup: 'WR',
      draftYear: payload.draftYear,
      playerName: payload.playerName,
      totalCandidatesSeen: 1,
      prospectsUpserted,
      metricsUpserted,
      evaluationsCreated,
      playersSkipped,
      errors
    };
  }
}
