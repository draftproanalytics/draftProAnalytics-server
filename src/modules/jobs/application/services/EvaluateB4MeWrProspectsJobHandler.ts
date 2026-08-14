import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { EvaluateB4MeWrProspectsPayloadDto, EvaluateB4MeWrProspectsResultDto } from '../../domain/dtos/B4MeWrEvaluation.dto';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type { IWrImportSeedRepository } from '@/modules/b4meImport/domain/repositories/IWrImportSeedRepository';
import type { IProspectLookupRepository } from '@/modules/b4meAnalysis/domain/repositories/IProspectLookupRepository';
import type { IB4MeWrMetricsRepository } from '@/modules/b4meAnalysis/domain/repositories/IB4MeWrMetricsRepository';
import type { IB4MeEvaluationOrchestratorRepository } from '@/modules/b4meAnalysis/domain/repositories/IB4MeEvaluationOrchestratorRepository';
import type { IProspectIdentityRepository } from '@/modules/prospectIdentity/domain/IProspectIdentityRepository';
import type { PrismaB4MeFrameworkRepository } from '@/modules/b4meAnalysis/infrastructure/repositories/PrismaB4MeFrameworkRepository';
import type { LiveWrProspectIntakeService } from '@/modules/b4meAnalysis/application/services/LiveWrProspectIntakeService';
import type { B4MeMethodologyService } from '@/modules/b4meAnalysis/application/services/B4MeMethodologyService';
import type { WrB4MeScoringService } from '@/modules/b4meAnalysis/application/services/WrB4MeScoringService';
import type { WrEvaluationKeyBuilder } from '@/modules/b4meAnalysis/application/services/WrEvaluationKeyBuilder';
import type { WrProspectSearchFilters, WrMetricsRecord } from '@/modules/b4meAnalysis/domain/contracts/WrFramework.types';

const readPayload = (value: Prisma.JsonValue | null): EvaluateB4MeWrProspectsPayloadDto => {
  if (value === null || Array.isArray(value) || typeof value !== 'object') throw new Error('B4Me WR job payload is required.');
  const row = value as Record<string, unknown>;
  const draftYear = row.draftYear;
  if (typeof draftYear !== 'number' || !Number.isInteger(draftYear) || draftYear < 2000 || draftYear > 2100) throw new Error('draftYear must be a valid year.');
  const refreshPolicy = row.refreshPolicy;
  if (refreshPolicy !== 'MISSING_ONLY' && refreshPolicy !== 'MISSING_OR_STALE' && refreshPolicy !== 'FORCE_REFRESH') throw new Error('Invalid B4Me refreshPolicy.');
  const scoringMode = row.scoringMode;
  if (scoringMode !== 'BASE_ONLY' && scoringMode !== 'BASE_PLUS_CONTEXT' && scoringMode !== 'FULL_DECISION_SCORE') throw new Error('Invalid B4Me scoringMode.');
  return { draftYear, positionGroup: 'WR', refreshPolicy, scoringMode };
};

export class EvaluateB4MeWrProspectsJobHandler {
  public constructor(
    private readonly jobs: IJobQueueRepository,
    private readonly seeds: IWrImportSeedRepository,
    private readonly prospects: IProspectLookupRepository,
    private readonly metrics: IB4MeWrMetricsRepository,
    private readonly evaluations: IB4MeEvaluationOrchestratorRepository,
    private readonly identities: IProspectIdentityRepository,
    private readonly frameworks: PrismaB4MeFrameworkRepository,
    private readonly intake: LiveWrProspectIntakeService,
    private readonly methodology: B4MeMethodologyService,
    private readonly scoring: WrB4MeScoringService,
    private readonly keys: WrEvaluationKeyBuilder,
    private readonly concurrency: number,
  ) {}

  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readPayload(job.payload);
    const framework = await this.frameworks.findActiveWrFramework();
    if (!framework) throw new Error('No active WR framework is configured.');
    const candidates = await this.seeds.findWideReceiversByYear(payload.draftYear);
    const result: { evaluated:number; reused:number; hydrated:number; manualFactsPreserved:number; identityReviewRequired:number; duplicateReviewRequired:number; providerUnavailable:number; providerTimeout:number; failed:number; outcomes:Array<{prospectId:number;playerName:string;result:'EVALUATED'|'REUSED'|'SKIPPED_IDENTITY_REVIEW'|'SKIPPED_DUPLICATE_REVIEW'|'PROVIDER_UNAVAILABLE'|'PROVIDER_TIMEOUT'|'FAILED';reason?:string}> } = { evaluated:0,reused:0,hydrated:0,manualFactsPreserved:0,identityReviewRequired:0,duplicateReviewRequired:0,providerUnavailable:0,providerTimeout:0,failed:0,outcomes:[] };
    let processed = 0;
    await this.jobs.updateJobProgress({ jobId: job.id, totalItems: candidates.length, processedItems: 0, progressPercent: candidates.length === 0 ? 100 : 0 });

    const processOne = async (candidate: (typeof candidates)[number]): Promise<void> => {
      try {
        await this.jobs.appendJobLog({ jobId:job.id, level:'info', message:`Processing ${candidate.playerName} (${processed + 1}/${candidates.length}).` });
        if (await this.identities.hasOpenDuplicateIssue(candidate.prospectId)) {
          result.duplicateReviewRequired += 1; result.outcomes.push({ prospectId:candidate.prospectId, playerName:candidate.playerName, result:'SKIPPED_DUPLICATE_REVIEW' });
          await this.jobs.appendJobLog({ jobId:job.id, level:'warn', message:`Skipped ${candidate.playerName}: duplicate review required.` }); return;
        }
        if (await this.identities.hasOpenIdentityIssue(candidate.prospectId)) {
          result.identityReviewRequired += 1; result.outcomes.push({ prospectId:candidate.prospectId, playerName:candidate.playerName, result:'SKIPPED_IDENTITY_REVIEW' });
          await this.jobs.appendJobLog({ jobId:job.id, level:'warn', message:`Skipped ${candidate.playerName}: identity review required.` }); return;
        }
        const prospect = (await this.prospects.searchWideReceivers(candidate.playerName, payload.draftYear)).find((item) => item.id === candidate.prospectId);
        if (!prospect) throw new Error('Prospect row was not found during B4Me evaluation.');
        let metric = await this.metrics.findByProspectId(candidate.prospectId);
        const manualBefore = this.hasManualObservedMetrics(metric);
        if (this.requiresHydration(metric, payload)) {
          try {
            await this.intake.getOrCreateFromLiveSource(candidate.playerName, payload.draftYear, candidate.prospectId);
          } catch (error) {
            const reason = error instanceof Error ? error.message : 'Provider request failed.';
            if (this.isProviderTimeout(error)) {
              result.providerTimeout += 1;
              result.outcomes.push({ prospectId:candidate.prospectId, playerName:candidate.playerName, result:'PROVIDER_TIMEOUT', reason });
              await this.jobs.appendJobLog({ jobId:job.id, level:'warn', message:`Provider timeout for ${candidate.playerName}: ${reason}` });
              return;
            }
            throw error;
          }
          if (await this.identities.hasOpenIdentityIssue(candidate.prospectId)) {
            result.identityReviewRequired += 1; result.outcomes.push({ prospectId:candidate.prospectId, playerName:candidate.playerName, result:'SKIPPED_IDENTITY_REVIEW' }); return;
          }
          metric = await this.metrics.findByProspectId(candidate.prospectId);
          if (!metric) { result.providerUnavailable += 1; result.outcomes.push({ prospectId:candidate.prospectId, playerName:candidate.playerName, result:'PROVIDER_UNAVAILABLE' }); return; }
          result.hydrated += 1;
          await this.jobs.appendJobLog({ jobId:job.id, level:'info', message:`Hydrated ${candidate.playerName}.` });
          if (manualBefore && this.hasManualObservedMetrics(metric)) result.manualFactsPreserved += 1;
        }
        if (!metric) { result.providerUnavailable += 1; result.outcomes.push({ prospectId:candidate.prospectId, playerName:candidate.playerName, result:'PROVIDER_UNAVAILABLE' }); return; }
        let createdEvaluation = false;
        let allEvaluationsReused = true;
        for (const limitationFiltersEnabled of [false, true]) {
          for (const decisionViewEnabled of [false, true]) {
            const filters: WrProspectSearchFilters = {
              playerName: prospect.playerName,
              draftYear: prospect.draftYear,
              scoringMode: payload.scoringMode,
              includeMethodology: false,
              includeTeamContextPlaceholder: false,
              enableCompetitionDiscount: limitationFiltersEnabled,
              enableInjuryAvailabilityAdjustment: limitationFiltersEnabled,
              enableQbOffenseContextAdjustment: limitationFiltersEnabled,
              enableSampleSizeAdjustment: limitationFiltersEnabled,
              enableArchetypeConfidenceAdjustment: limitationFiltersEnabled,
              enableCoachabilityAdjustment: decisionViewEnabled,
              enableRfaAdjustment: decisionViewEnabled,
              enableRvaAdjustment: decisionViewEnabled,
            };
            const evaluationKey = this.keys.build(prospect.id, framework.frameworkVersion, filters);
            const existing = await this.evaluations.findStoredWrEvaluation(evaluationKey);
            if (existing && payload.refreshPolicy !== 'FORCE_REFRESH') continue;

            allEvaluationsReused = false;
            const computed = this.scoring.compute(prospect, metric, filters);
            await this.evaluations.createStoredWrEvaluation({
              prospectId: prospect.id,
              playerName: prospect.playerName,
              school: prospect.school,
              draftYear: prospect.draftYear,
              frameworkCatalogId: framework.id,
              frameworkVersion: framework.frameworkVersion,
              scoringMode: filters.scoringMode,
              evaluationKey,
              methodologySnapshotJson: this.methodology.buildMethodologySnapshot(framework.frameworkVersion, filters),
              activeFilterSummaryJson: this.methodology.buildActiveFilterSummary(filters),
              optionalTeamContextJson: this.methodology.buildOptionalTeamContext(false),
              computed,
            });
            createdEvaluation = true;
          }
        }
        if (createdEvaluation) {
          result.evaluated += 1;
          await this.jobs.appendJobLog({ jobId:job.id, level:'info', message:`Evaluated ${candidate.playerName}.` });
          result.outcomes.push({ prospectId:prospect.id, playerName:prospect.playerName, result:'EVALUATED' });
        } else if (allEvaluationsReused) {
          result.reused += 1;
          await this.jobs.appendJobLog({ jobId:job.id, level:'info', message:`Reused current B4Me evaluation for ${candidate.playerName}.` });
          result.outcomes.push({ prospectId:prospect.id, playerName:prospect.playerName, result:'REUSED' });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown B4Me prospect failure.';
        result.failed += 1; result.outcomes.push({ prospectId:candidate.prospectId, playerName:candidate.playerName, result:'FAILED', reason });
        await this.jobs.appendJobLog({ jobId:job.id, level:'error', message:`Failed ${candidate.playerName}: ${reason}` });
      } finally {
        processed += 1;
        await this.jobs.updateJobProgress({ jobId:job.id,totalItems:candidates.length,processedItems:processed,progressPercent:candidates.length === 0 ? 100 : Math.floor((processed / candidates.length) * 100) });
      }
    };

    let nextIndex = 0;
    const worker = async (): Promise<void> => { while (true) { const index = nextIndex; nextIndex += 1; const candidate = candidates[index]; if (!candidate) return; await processOne(candidate); } };
    await Promise.all(Array.from({ length: Math.min(Math.max(1, this.concurrency), Math.max(1, candidates.length)) }, () => worker()));
    const summary: EvaluateB4MeWrProspectsResultDto = { draftYear:payload.draftYear,positionGroup:'WR',total:candidates.length,...result };
    await this.jobs.completeJob({ jobId:job.id, resultCode:result.failed > 0 ? 'COMPLETED_WITH_ITEM_FAILURES' : 'OK', resultJson: summary as unknown as Prisma.InputJsonObject });
  }

  private requiresHydration(metric: WrMetricsRecord | null, payload: EvaluateB4MeWrProspectsPayloadDto): boolean {
    if (!metric) return true;
    if (payload.refreshPolicy === 'FORCE_REFRESH') return true;
    if (payload.refreshPolicy === 'MISSING_ONLY') return false;
    return metric.sourceMetadataJson?.metricSeasonYear !== payload.draftYear - 1 || metric.sourceMetadataJson?.seasonSelectionPolicy !== 'FINAL_COLLEGE_SEASON';
  }

  private hasManualObservedMetrics(metric: WrMetricsRecord | null): boolean { return metric?.sourceMetadataJson?.manualObservation?.sourceType === 'MANUAL'; }

  private isProviderTimeout(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = `${error.name} ${error.message}`.toLowerCase();
    return message.includes('timeout') || message.includes('timed out') || message.includes('etimedout') || message.includes('econnaborted');
  }
}

