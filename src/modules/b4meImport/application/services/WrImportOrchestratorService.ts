import type { PrismaB4MeFrameworkRepository } from '../../../b4meAnalysis/infrastructure/repositories/PrismaB4MeFrameworkRepository';
import type { IB4MeWrMetricsRepository } from '../../../b4meAnalysis/domain/repositories/IB4MeWrMetricsRepository';
import type { IB4MeEvaluationOrchestratorRepository } from '../../../b4meAnalysis/domain/repositories/IB4MeEvaluationOrchestratorRepository';
import type { IProspectLookupRepository } from '../../../b4meAnalysis/domain/repositories/IProspectLookupRepository';
import type { WrProspectSearchFilters } from '../../../b4meAnalysis/domain/contracts/WrFramework.types';
import type { B4MeScoringMode } from '../../../b4meAnalysis/domain/enums/B4MeScoringMode';
import { B4MeMethodologyService } from '../../../b4meAnalysis/application/services/B4MeMethodologyService';
import { WrB4MeScoringService } from '../../../b4meAnalysis/application/services/WrB4MeScoringService';
import { WrEvaluationKeyBuilder } from '../../../b4meAnalysis/application/services/WrEvaluationKeyBuilder';
import { LiveWrProspectIntakeService } from '../../../b4meAnalysis/application/services/LiveWrProspectIntakeService';
import type { IJobLogRepository } from '../../domain/repositories/IJobLogRepository';
import type {
  IWrImportSeedRepository,
  WrImportSeedRecord
} from '../../domain/repositories/IWrImportSeedRepository';
import type {
  B4MeWrImportPlayerJobPayload,
  B4MeWrImportYearJobPayload
} from '../../domain/contracts/B4MeImportJobPayload';
import type { ILiveWrProspectListProvider } from '../../domain/repositories/ILiveWrProspectListProvider';

interface WrImportCandidate {
  readonly playerName: string;
  readonly draftYear: number | null;
  readonly school: string | null;
}

export interface WrImportRunSummary {
  draftYear: number | null;
  playerName: string | null;
  positionGroup: 'WR';
  totalCandidatesSeen: number;
  prospectsUpserted: number;
  metricsUpserted: number;
  evaluationsCreated: number;
  playersSkipped: number;
  errors: Array<{
    playerName: string;
    reason: string;
  }>;
}

type RunPayload = B4MeWrImportYearJobPayload | B4MeWrImportPlayerJobPayload;

export class WrImportOrchestratorService {
  public constructor(
    private readonly frameworkRepository: PrismaB4MeFrameworkRepository,
    private readonly prospectRepository: IProspectLookupRepository,
    private readonly metricsRepository: IB4MeWrMetricsRepository,
    private readonly evaluationRepository: IB4MeEvaluationOrchestratorRepository,
    private readonly methodologyService: B4MeMethodologyService,
    private readonly scoringService: WrB4MeScoringService,
    private readonly evaluationKeyBuilder: WrEvaluationKeyBuilder,
    private readonly liveWrProspectIntakeService: LiveWrProspectIntakeService,
    private readonly jobLogRepository: IJobLogRepository,
    private readonly liveWrProspectListProvider: ILiveWrProspectListProvider,
    private readonly wrImportSeedRepository: IWrImportSeedRepository
  ) {}

  public async run(jobId: number, payload: RunPayload): Promise<WrImportRunSummary> {
    const framework = await this.frameworkRepository.findActiveWrFramework();

    if (framework === null) {
      throw new Error('No active WR framework is configured.');
    }

    const candidates = await this.resolveCandidates(jobId, payload);

    const summary: WrImportRunSummary = {
      draftYear: payload.draftYear,
      playerName: 'playerName' in payload ? payload.playerName : null,
      positionGroup: 'WR',
      totalCandidatesSeen: candidates.length,
      prospectsUpserted: 0,
      metricsUpserted: 0,
      evaluationsCreated: 0,
      playersSkipped: 0,
      errors: []
    };

    for (const candidate of candidates) {
      try {
        await this.jobLogRepository.create(jobId, 'INFO', `Processing ${candidate.playerName}.`);

        let prospects = await this.prospectRepository.searchWideReceivers(
          candidate.playerName,
          candidate.draftYear
        );

        if (prospects.length === 0) {
          const hydrated = await this.liveWrProspectIntakeService.getOrCreateFromLiveSource(
            candidate.playerName,
            candidate.draftYear
          );

          if (hydrated !== null) {
            summary.prospectsUpserted += 1;
          }

          prospects = await this.prospectRepository.searchWideReceivers(
            candidate.playerName,
            candidate.draftYear
          );
        }

        if (prospects.length === 0) {
          summary.playersSkipped += 1;
          summary.errors.push({
            playerName: candidate.playerName,
            reason: 'No local prospect row found after hydration attempt.'
          });

          await this.jobLogRepository.create(
            jobId,
            'WARN',
            `Skipped ${candidate.playerName}: no local prospect row found.`
          );

          continue;
        }

        for (const prospect of prospects) {
          let metrics = await this.metricsRepository.findByProspectId(prospect.id);

          if (metrics === null) {
            const hydrated = await this.liveWrProspectIntakeService.getOrCreateFromLiveSource(
              prospect.playerName,
              prospect.draftYear
            );

            if (hydrated !== null) {
              summary.metricsUpserted += 1;
            }

            metrics = await this.metricsRepository.findByProspectId(prospect.id);
          }

          if (metrics === null) {
            summary.playersSkipped += 1;
            summary.errors.push({
              playerName: prospect.playerName,
              reason: 'Metrics not available after hydration attempt.'
            });

            await this.jobLogRepository.create(
              jobId,
              'WARN',
              `Skipped ${prospect.playerName}: metrics not available.`
            );

            continue;
          }

          if (!payload.recomputeEvaluations) {
            await this.jobLogRepository.create(
              jobId,
              'INFO',
              `Metrics ready for ${prospect.playerName}; recompute disabled.`
            );
            continue;
          }

          for (const scoringMode of payload.scoringModes) {
            const filters: WrProspectSearchFilters = {
              playerName: prospect.playerName,
              draftYear: prospect.draftYear,
              scoringMode,
              includeMethodology: false,
              includeTeamContextPlaceholder: false,
              enableCompetitionDiscount: true,
              enableInjuryAvailabilityAdjustment: true,
              enableQbOffenseContextAdjustment: true,
              enableSampleSizeAdjustment: true,
              enableArchetypeConfidenceAdjustment: true,
              enableCoachabilityAdjustment: true,
              enableRfaAdjustment: true,
              enableRvaAdjustment: true
            };

            const evaluationKey = this.evaluationKeyBuilder.build(
              prospect.id,
              framework.frameworkVersion,
              filters
            );

            const methodology = this.methodologyService.buildMethodologySnapshot(
              framework.frameworkVersion,
              filters
            );
            const activeFilterSummary = this.methodologyService.buildActiveFilterSummary(filters);
            const optionalTeamContext = this.methodologyService.buildOptionalTeamContext(false);
            const computed = this.scoringService.compute(prospect, metrics, filters);

            await this.evaluationRepository.createStoredWrEvaluation({
              prospectId: prospect.id,
              playerName: prospect.playerName,
              school: prospect.school,
              draftYear: prospect.draftYear,
              frameworkCatalogId: framework.id,
              frameworkVersion: framework.frameworkVersion,
              scoringMode,
              evaluationKey,
              methodologySnapshotJson: methodology,
              activeFilterSummaryJson: activeFilterSummary,
              optionalTeamContextJson: optionalTeamContext,
              computed
            });

            summary.evaluationsCreated += 1;

            await this.jobLogRepository.create(
              jobId,
              'INFO',
              `Created evaluation for ${prospect.playerName} (${scoringMode}).`
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown import error';

        summary.errors.push({
          playerName: candidate.playerName,
          reason: message
        });

        await this.jobLogRepository.create(
          jobId,
          'ERROR',
          `Failed ${candidate.playerName}: ${message}`
        );
      }
    }

    return summary;
  }

  private async resolveCandidates(
    jobId: number,
    payload: RunPayload
  ): Promise<WrImportCandidate[]> {
    if ('playerName' in payload) {
      return [
        {
          playerName: payload.playerName,
          draftYear: payload.draftYear,
          school: null
        }
      ];
    }

    const upstreamCandidates = await this.getUpstreamYearCandidates(payload.draftYear);

    if (upstreamCandidates.length > 0) {
      await this.jobLogRepository.create(
        jobId,
        'INFO',
        `Found ${upstreamCandidates.length} WR import candidates for ${payload.draftYear} from upstream provider.`
      );

      return upstreamCandidates.map((candidate: WrImportCandidate) => ({
        playerName: candidate.playerName,
        draftYear: candidate.draftYear,
        school: candidate.school
      }));
    }

    const localSeeds: WrImportSeedRecord[] =
      await this.wrImportSeedRepository.findWideReceiversByYear(payload.draftYear);

    await this.jobLogRepository.create(
      jobId,
      'INFO',
      `Found 0 WR import candidates for ${payload.draftYear} from upstream provider. Falling back to ${localSeeds.length} local Prospect rows.`
    );

    return localSeeds.map((seed) => ({
      playerName: seed.playerName,
      draftYear: seed.draftYear,
      school: seed.school
    }));
  }

  private async getUpstreamYearCandidates(draftYear: number): Promise<WrImportCandidate[]> {
    const provider = this.liveWrProspectListProvider as unknown as {
      findWideReceiversByYear?: (draftYear: number) => Promise<WrImportCandidate[]>;
    };

    if (typeof provider.findWideReceiversByYear !== 'function') {
      return [];
    }

    const rows = await provider.findWideReceiversByYear(draftYear);
    return Array.isArray(rows) ? rows : [];
  }
}