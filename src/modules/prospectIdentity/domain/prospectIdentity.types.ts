export const DuplicateReviewStatus = {
  Open: 'OPEN', Deferred: 'DEFERRED', Merged: 'MERGED', NotDuplicate: 'NOT_DUPLICATE', Deleted: 'DELETED',
} as const;
export type DuplicateReviewStatus = (typeof DuplicateReviewStatus)[keyof typeof DuplicateReviewStatus];

export const IdentityReviewStatus = {
  Open: 'OPEN', Deferred: 'DEFERRED', Resolved: 'RESOLVED', Dismissed: 'DISMISSED',
} as const;
export type IdentityReviewStatus = (typeof IdentityReviewStatus)[keyof typeof IdentityReviewStatus];

export interface ProspectIdentitySummary {
  readonly id: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly position: string;
  readonly college: string;
  readonly draftYear: number | null;
  readonly homeCity: string | null;
  readonly homeState: string | null;
}

export interface DuplicateCandidate {
  readonly id: number;
  readonly left: ProspectIdentitySummary | null;
  readonly right: ProspectIdentitySummary | null;
  readonly matchScore: number;
  readonly matchReasons: readonly string[];
  readonly status: string;
  readonly resolution: string | null;
  readonly resolutionNotes: string | null;
  readonly createdAt: Date;
  readonly reviewedAt: Date | null;
}

export interface MergeConflict {
  readonly relation: string;
  readonly reason: string;
  readonly survivor: unknown;
  readonly duplicate: unknown;
}

export interface MergePreview {
  readonly survivor: ProspectIdentitySummary;
  readonly duplicate: ProspectIdentitySummary;
  readonly fieldsCopied: Readonly<Record<string, unknown>>;
  readonly relationsToMove: Readonly<Record<string, number>>;
  readonly conflicts: readonly MergeConflict[];
  readonly dependencyCounts: Readonly<Record<string, number>>;
}

export type ProspectIdentityPreflightScanState = 'NEVER_RUN' | 'STALE' | 'CURRENT';

export interface ProspectIdentityPreflightStatus {
  readonly draftYear: number;
  readonly position: string;
  readonly prospectCount: number;
  readonly scanState: ProspectIdentityPreflightScanState;
  readonly latestCompletedScanAt: Date | null;
  readonly latestProspectChangeAt: Date | null;
  readonly unresolvedDuplicateCount: number;
  readonly unresolvedIdentityCount: number;
}
