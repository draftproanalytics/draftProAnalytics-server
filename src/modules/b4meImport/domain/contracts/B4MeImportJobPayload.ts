import type { B4MeScoringMode } from '../../../b4meAnalysis/domain/enums/B4MeScoringMode';

export interface B4MeWrImportYearJobPayload {
  readonly positionGroup: 'WR';
  readonly draftYear: number;
  readonly overwriteMetrics: boolean;
  readonly recomputeEvaluations: boolean;
  readonly scoringModes: ReadonlyArray<B4MeScoringMode>;
}

export interface B4MeWrImportPlayerJobPayload {
  readonly positionGroup: 'WR';
  readonly draftYear: number | null;
  readonly playerName: string;
  readonly overwriteMetrics: boolean;
  readonly recomputeEvaluations: boolean;
  readonly scoringModes: ReadonlyArray<B4MeScoringMode>;
}

export type B4MeImportJobPayload =
  | B4MeWrImportYearJobPayload
  | B4MeWrImportPlayerJobPayload;

export interface B4MeImportResultSummary {
  readonly positionGroup: 'WR';
  readonly draftYear: number | null;
  readonly playerName: string | null;
  readonly totalCandidatesSeen: number;
  readonly prospectsUpserted: number;
  readonly metricsUpserted: number;
  readonly evaluationsCreated: number;
  readonly playersSkipped: number;
  readonly errors: ReadonlyArray<{
    readonly playerName: string;
    readonly reason: string;
  }>;
}
