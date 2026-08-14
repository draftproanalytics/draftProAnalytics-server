import type { LiveWrProspectPayload } from '../contracts/LiveWrProspect.types';

export interface ManualWrObservedMetricsInput {
  readonly prospectId: number;
  readonly yprr: number;
  readonly pffOverallGrade: number;
  readonly contestedCatchRate: number;
  readonly behindLosTargetRate: number;
  readonly metricSeasonYear: number;
  readonly sourceName: string;
  readonly sourceUrl: string | null;
  readonly notes: string | null;
  readonly enteredByPersonId: number;
}

export interface IB4MeWrMetricsWriteRepository {
  upsertFromLivePayload(prospectId: number, payload: LiveWrProspectPayload): Promise<void>;
  saveManualObservedMetrics(input: ManualWrObservedMetricsInput): Promise<void>;
}
