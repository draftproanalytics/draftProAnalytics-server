import type { B4MeScoringMode } from '@/modules/b4meAnalysis/domain/enums/B4MeScoringMode';

export type B4MeRefreshPolicy = 'MISSING_ONLY' | 'MISSING_OR_STALE' | 'FORCE_REFRESH';

export interface EvaluateB4MeWrProspectsPayloadDto {
  readonly draftYear: number;
  readonly positionGroup: 'WR';
  readonly refreshPolicy: B4MeRefreshPolicy;
  readonly scoringMode: B4MeScoringMode;
  readonly requestedByPersonId?: number;
}

export interface EvaluateB4MeWrProspectsResultDto {
  readonly draftYear: number;
  readonly positionGroup: 'WR';
  readonly total: number;
  readonly evaluated: number;
  readonly reused: number;
  readonly hydrated: number;
  readonly manualFactsPreserved: number;
  readonly identityReviewRequired: number;
  readonly duplicateReviewRequired: number;
  readonly providerUnavailable: number;
  readonly providerTimeout: number;
  readonly failed: number;
  readonly outcomes: ReadonlyArray<{
    readonly prospectId: number;
    readonly playerName: string;
    readonly result: 'EVALUATED' | 'REUSED' | 'SKIPPED_IDENTITY_REVIEW' | 'SKIPPED_DUPLICATE_REVIEW' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_TIMEOUT' | 'FAILED';
    readonly reason?: string;
  }>;
}
