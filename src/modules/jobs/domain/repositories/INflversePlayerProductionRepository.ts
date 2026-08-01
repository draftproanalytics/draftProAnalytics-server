import type { Prisma } from '@prisma/client';
import type { NflversePlayerProductionRecordDto } from '../dtos/NflversePlayerProduction.dto';
export interface StageNflverseProductionResult { readonly staged: number; readonly autoMatched: number; readonly unmatched: number; }
export interface INflversePlayerProductionRepository {
  stage(jobId: number, seasonYear: number, summaryLevel: string, records: readonly NflversePlayerProductionRecordDto[], teamId?: number): Promise<StageNflverseProductionResult>;
  promote(seasonYear: number, stagingIds?: readonly string[]): Promise<{ promoted: number; skipped: number }>;
  recalculateAssessments(seasonYear: number, draftYear: number, teamId?: number): Promise<{ assessmentsUpdated: number }>;
}
