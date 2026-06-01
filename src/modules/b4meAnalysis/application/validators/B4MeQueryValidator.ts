import type { Request } from 'express';
import {
  B4ME_POSITION_GROUPS,
  B4ME_SCORING_MODES,
  type B4MePositionGroup,
  type B4MeScoringMode
} from '../../domain/enums/B4MeEnums';
import type { B4MeEvaluateProspectsQueryDto } from '../dto/B4MeEvaluateProspectsQueryDto';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}

function parseNullableNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 3000) {
    throw new Error(`Invalid numeric value: ${value}`);
  }

  return parsed;
}

export class B4MeQueryValidator {
  public validate(request: Request): B4MeEvaluateProspectsQueryDto {
    const positionGroup = request.query.positionGroup;
    if (typeof positionGroup !== 'string' || !B4ME_POSITION_GROUPS.includes(positionGroup as B4MePositionGroup)) {
      throw new Error('positionGroup is required and must be one of WR, ED, OT, DT, or CB.');
    }

    const scoringModeRaw = typeof request.query.scoringMode === 'string'
      ? request.query.scoringMode
      : 'ENHANCED';

    if (!B4ME_SCORING_MODES.includes(scoringModeRaw as B4MeScoringMode)) {
      throw new Error('scoringMode must be one of BASE, ENHANCED, or DECISION_VIEW.');
    }

    const playerNameRaw = typeof request.query.playerName === 'string' ? request.query.playerName.trim() : '';
    const playerName = playerNameRaw.length > 0 ? playerNameRaw : null;

    return {
      positionGroup: positionGroup as B4MePositionGroup,
      draftYear: parseNullableNumber(typeof request.query.draftYear === 'string' ? request.query.draftYear : undefined),
      playerName,
      scoringMode: scoringModeRaw as B4MeScoringMode,
      limitationFiltersEnabled: parseBoolean(
        typeof request.query.limitationFiltersEnabled === 'string' ? request.query.limitationFiltersEnabled : undefined,
        true
      ),
      decisionViewEnabled: parseBoolean(
        typeof request.query.decisionViewEnabled === 'string' ? request.query.decisionViewEnabled : undefined,
        true
      ),
      includeMethodology: parseBoolean(
        typeof request.query.includeMethodology === 'string' ? request.query.includeMethodology : undefined,
        true
      ),
      includeTeamContextPlaceholder: parseBoolean(
        typeof request.query.includeTeamContextPlaceholder === 'string'
          ? request.query.includeTeamContextPlaceholder
          : undefined,
        true
      )
    };
  }
}
