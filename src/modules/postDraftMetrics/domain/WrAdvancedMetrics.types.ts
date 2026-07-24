export const WR_METRIC_FIELDS = [
  'yardsPerRouteRun',
  'receivingGrade',
  'contestedCatchRate',
  'behindLosTargetRate',
  'catchRate',
  'missedTacklesForcedPerReception',
  'yacAfterContactPerReception',
] as const;

export type WrMetricField = (typeof WR_METRIC_FIELDS)[number];
export type WrMetricSourceType = 'DPA' | 'FREE_API' | 'MANUAL' | 'CSV' | 'LICENSED_PROVIDER' | 'DERIVED';

export interface WrMetricValues {
  yardsPerRouteRun: number | null;
  receivingGrade: number | null;
  contestedCatchRate: number | null;
  behindLosTargetRate: number | null;
  catchRate: number | null;
  missedTacklesForcedPerReception: number | null;
  yacAfterContactPerReception: number | null;
}

export interface UpsertWrMetricCommand extends Partial<WrMetricValues> {
  prospectId: number;
  draftYear: number;
  seasonYear: number;
  sourceName: string;
  sourceType: WrMetricSourceType;
  sourceReference?: string | null;
  notes?: string | null;
  verified?: boolean;
  providerPriority?: number | null;
  active?: boolean;
  rawPayload?: unknown;
  allowVerifiedOverwrite?: boolean;
  reason?: string | null;
}

export interface WrMetricActor {
  personId: number | null;
  userName: string | null;
}

export interface WrMetricRecord extends WrMetricValues {
  id: string;
  prospectId: number;
  draftYear: number;
  seasonYear: number;
  sourceName: string;
  sourceType: WrMetricSourceType;
  sourceReference: string | null;
  enteredBy: number | null;
  enteredAt: string;
  updatedAt: string;
  verified: boolean;
  verifiedBy: number | null;
  verifiedAt: string | null;
  verificationNotes: string | null;
  notes: string | null;
  providerPriority: number | null;
  active: boolean;
}

export interface WrMetricProvenance {
  value: number;
  sourceType: WrMetricSourceType;
  sourceName: string;
  sourceReference: string | null;
  verified: boolean;
  recordId: string;
  providerPriority: number;
  seasonYear: number;
  updatedAt: string;
}

export type ResolvedWrMetric = WrMetricProvenance | null;
export type ResolvedWrMetricMap = Record<WrMetricField, ResolvedWrMetric>;

export interface WrAdvancedMetricsResult {
  prospectId: number;
  draftYear: number;
  metrics: ResolvedWrMetricMap;
  resolvedRecordIds: string[];
  missingMetrics: WrMetricField[];
}

export interface CsvPreviewRow {
  rowNumber: number;
  status: 'VALID' | 'INVALID' | 'SKIPPED';
  errors: Array<{ field: string; message: string }>;
  willCreate: boolean;
  willUpdate: boolean;
  duplicateOfRowNumber: number | null;
  command: UpsertWrMetricCommand | null;
}

export interface CsvImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  skippedRows: number;
  missingProspects: number;
  duplicateRows: number;
  existingRecordsToUpdate: number;
  rows: CsvPreviewRow[];
}
