import type { B4MeScoringMode } from '../enums/B4MeScoringMode';
import type { WrComputedEvaluation } from '../contracts/WrFramework.types';

export interface StoredB4MeEvaluationRecord {
  readonly id: bigint;
  readonly prospectId: number | null;
  readonly playerName: string;
  readonly school: string | null;
  readonly draftYear: number | null;
  readonly positionGroup: string;
  readonly frameworkVersion: string;
  readonly scoringMode: B4MeScoringMode;
  readonly rawMetricsJson: Record<string, unknown>;
  readonly baseScoringJson: Record<string, unknown>;
  readonly modifiersJson: Record<string, unknown>;
  readonly coachabilityJson: Record<string, unknown>;
  readonly rfaJson: Record<string, unknown>;
  readonly flagsJson: Record<string, unknown>;
  readonly scoresJson: Record<string, unknown>;
  readonly optionalFiltersJson: Record<string, unknown>;
  readonly methodologySnapshotJson: Record<string, unknown> | null;
  readonly scoreExplanation: string | null;
  readonly projectionNote: string | null;
  readonly decisionTraceJson: Record<string, unknown> | null;
  readonly activeFilterSummaryJson: Record<string, unknown> | null;
  readonly optionalTeamContextJson: Record<string, unknown> | null;
  readonly keyFlag: string | null;
  readonly contactArchetype: string | null;
  readonly coachabilityTier: string | null;
  readonly pressManSurvivability: string | null;
  readonly rfaTier: string | null;
  readonly rvaTier: string | null;
  readonly finalB4MeScore: number | null;
  readonly rvaPlaceholderScore: number | null;
}

export interface CreateStoredB4MeEvaluationInput {
  readonly prospectId: number;
  readonly playerName: string;
  readonly school: string | null;
  readonly draftYear: number | null;
  readonly frameworkCatalogId: bigint | null;
  readonly frameworkVersion: string;
  readonly scoringMode: B4MeScoringMode;
  readonly evaluationKey: string;
  readonly methodologySnapshotJson: Record<string, unknown> | null;
  readonly activeFilterSummaryJson: Record<string, unknown>;
  readonly optionalTeamContextJson: Record<string, unknown> | null;
  readonly computed: WrComputedEvaluation;
}

export interface IB4MeEvaluationOrchestratorRepository {
  findStoredWrEvaluation(evaluationKey: string): Promise<StoredB4MeEvaluationRecord | null>;
  createStoredWrEvaluation(input: CreateStoredB4MeEvaluationInput): Promise<StoredB4MeEvaluationRecord>;
  deleteStoredWrEvaluationsForProspect(prospectId: number): Promise<void>;
}