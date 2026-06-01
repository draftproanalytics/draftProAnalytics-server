import type { B4MePositionGroup, B4MeScoringMode } from '../../domain/enums/B4MeEnums';

export interface B4MeEvaluateProspectsQueryDto {
  positionGroup: B4MePositionGroup;
  draftYear: number | null;
  playerName: string | null;
  scoringMode: B4MeScoringMode;
  limitationFiltersEnabled: boolean;
  decisionViewEnabled: boolean;
  includeMethodology: boolean;
  includeTeamContextPlaceholder: boolean;
}
