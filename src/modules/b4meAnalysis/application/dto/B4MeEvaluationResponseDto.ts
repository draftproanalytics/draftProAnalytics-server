import type {
  B4MeActiveFilterSummary,
  B4MeDecisionViewDimensions,
  B4MeMethodologyMetadata,
  B4MeOptionalTeamContext,
  B4MeScoreExplanation
} from '../../domain/contracts/B4MeFrameworkContracts';
import type { B4MePositionGroup } from '../../domain/enums/B4MeEnums';

export interface B4MeProspectEvaluationRowDto {
  prospectId: string;
  playerName: string;
  positionGroup: B4MePositionGroup;
  draftYear: number | null;
  baseScore: number;
  enhancedScore: number;
  decisionViewScore: number;
  scoreLabel: string;
  scoreExplanation: B4MeScoreExplanation;
  evaluationNotes: string | null;
  decisionViewDimensions: B4MeDecisionViewDimensions;
}

export interface B4MeEvaluationResponseDto {
  rows: B4MeProspectEvaluationRowDto[];
  methodology: B4MeMethodologyMetadata | null;
  activeFilterSummary: B4MeActiveFilterSummary;
  optionalTeamContext: B4MeOptionalTeamContext | null;
}
