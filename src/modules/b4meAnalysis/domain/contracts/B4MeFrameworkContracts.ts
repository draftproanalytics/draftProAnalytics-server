import type {
  B4MePositionGroup,
  B4MeScoringMode,
  B4MeValidationStatus
} from '../enums/B4MeEnums';

export interface B4MeOptionalTeamContext {
  teamCoachingGradeByGroup: string | null;
  teamDevelopmentEnvironment: string | null;
  teamUsageFitContext: string | null;
  isDeferred: boolean;
  isApplied: boolean;
  label: string;
}

export interface B4MeMethodologySection {
  key: string;
  title: string;
  body: string;
}

export interface B4MeMethodologyMetadata {
  frameworkVersion: string;
  positionGroupFrameworkType: string;
  methodologyLineage: string;
  validationStatus: B4MeValidationStatus;
  validationNote: string | null;
  knownLimitations: string[];
  scoringModeUsed: B4MeScoringMode;
  methodologySections: B4MeMethodologySection[];
}

export interface B4MeActiveFilterSummary {
  limitationFiltersEnabled: boolean;
  decisionViewEnabled: boolean;
  scoringMode: B4MeScoringMode;
  playerName: string | null;
  draftYear: number | null;
  positionGroup: B4MePositionGroup;
  badges: string[];
}

export interface B4MeScoreExplanation {
  title: string;
  summary: string;
  lines: string[];
}

export interface B4MeFrameworkCatalogRecord {
  id: bigint;
  positionGroup: B4MePositionGroup;
  frameworkVersion: string;
  frameworkType: string;
  methodologyLineage: string;
  validationStatus: B4MeValidationStatus;
  validationNote: string | null;
  knownLimitations: string | null;
  scoringModeDefault: B4MeScoringMode;
  isActive: boolean;
}

export interface B4MeEvaluationMetadataRecord {
  prospectEvaluationId: bigint;
  scoringModeUsed: B4MeScoringMode;
  evaluationNotes: string | null;
  validationStatus: B4MeValidationStatus;
  activeFilterSummary: Record<string, unknown> | null;
  methodologySnapshot: Record<string, unknown> | null;
  futureTeamContext: Record<string, unknown> | null;
}

export interface B4MeDecisionViewDimensions {
  coachability: number;
  rfa: number;
  rva: number;
}

export interface B4MeProspectEvaluation {
  prospectEvaluationId: string;
  playerName: string;
  positionGroup: B4MePositionGroup;
  draftYear: number | null;
  baseScore: number;
  enhancedScore: number;
  decisionViewScore: number;
  scoreLabel: string;
  scoreExplanation: B4MeScoreExplanation;
  evaluationNotes: string | null;
  methodology: B4MeMethodologyMetadata;
  activeFilterSummary: B4MeActiveFilterSummary;
  optionalTeamContext: B4MeOptionalTeamContext;
  decisionViewDimensions: B4MeDecisionViewDimensions;
}
