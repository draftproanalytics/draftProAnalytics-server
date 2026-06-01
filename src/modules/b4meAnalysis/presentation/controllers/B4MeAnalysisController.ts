import type { Request, Response } from 'express';
import type { GetB4MeEvaluationUseCase } from '../../application/usecases/GetB4MeEvaluationUseCase';
import type { B4MeScoringMode } from '../../domain/enums/B4MeScoringMode';

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized: string = value.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return defaultValue;
}

function parseNullableInt(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed: number = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseRequiredInt(value: string): number | null {
  const parsed: number = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseScoringMode(value: unknown): B4MeScoringMode {
  if (typeof value !== 'string') {
    return 'BASE_PLUS_CONTEXT';
  }

  const normalized: string = value.trim().toUpperCase();

  if (
    normalized === 'BASE_ONLY' ||
    normalized === 'BASE_PLUS_CONTEXT' ||
    normalized === 'FULL_DECISION_SCORE'
  ) {
    return normalized;
  }

  return 'BASE_PLUS_CONTEXT';
}

export class B4MeAnalysisController {
  public constructor(
    private readonly getB4MeEvaluationUseCase: GetB4MeEvaluationUseCase
  ) {}

  public async search(request: Request, response: Response): Promise<void> {
    const playerName: string | null =
      typeof request.query.playerName === 'string' && request.query.playerName.trim().length > 0
        ? request.query.playerName.trim()
        : null;

    const result = await this.getB4MeEvaluationUseCase.execute({
      positionGroup: 'WR',
      playerName,
      draftYear: parseNullableInt(request.query.draftYear),
      scoringMode: parseScoringMode(request.query.scoringMode),
      includeMethodology: parseBoolean(request.query.includeMethodology, true),
      includeTeamContextPlaceholder: parseBoolean(
        request.query.includeTeamContextPlaceholder,
        false
      ),
      enableCompetitionDiscount: parseBoolean(
        request.query.enableCompetitionDiscount,
        true
      ),
      enableInjuryAvailabilityAdjustment: parseBoolean(
        request.query.enableInjuryAvailabilityAdjustment,
        true
      ),
      enableQbOffenseContextAdjustment: parseBoolean(
        request.query.enableQbOffenseContextAdjustment,
        true
      ),
      enableSampleSizeAdjustment: parseBoolean(
        request.query.enableSampleSizeAdjustment,
        true
      ),
      enableArchetypeConfidenceAdjustment: parseBoolean(
        request.query.enableArchetypeConfidenceAdjustment,
        true
      ),
      enableCoachabilityAdjustment: parseBoolean(
        request.query.enableCoachabilityAdjustment,
        true
      ),
      enableRfaAdjustment: parseBoolean(
        request.query.enableRfaAdjustment,
        true
      ),
      enableRvaAdjustment: parseBoolean(
        request.query.enableRvaAdjustment,
        true
      )
    });

    response.status(200).json(result);
  }

  public async getById(request: Request, response: Response): Promise<void> {
    const prospectId: number | null = parseRequiredInt(request.params.id);

    if (prospectId === null) {
      response.status(400).json({
        message: 'Invalid prospect id.'
      });
      return;
    }

    const result = await this.getB4MeEvaluationUseCase.executeByProspectId({
      positionGroup: 'WR',
      prospectId,
      scoringMode: parseScoringMode(request.query.scoringMode),
      includeMethodology: parseBoolean(request.query.includeMethodology, true),
      includeTeamContextPlaceholder: parseBoolean(
        request.query.includeTeamContextPlaceholder,
        false
      ),
      enableCompetitionDiscount: parseBoolean(
        request.query.enableCompetitionDiscount,
        true
      ),
      enableInjuryAvailabilityAdjustment: parseBoolean(
        request.query.enableInjuryAvailabilityAdjustment,
        true
      ),
      enableQbOffenseContextAdjustment: parseBoolean(
        request.query.enableQbOffenseContextAdjustment,
        true
      ),
      enableSampleSizeAdjustment: parseBoolean(
        request.query.enableSampleSizeAdjustment,
        true
      ),
      enableArchetypeConfidenceAdjustment: parseBoolean(
        request.query.enableArchetypeConfidenceAdjustment,
        true
      ),
      enableCoachabilityAdjustment: parseBoolean(
        request.query.enableCoachabilityAdjustment,
        true
      ),
      enableRfaAdjustment: parseBoolean(
        request.query.enableRfaAdjustment,
        true
      ),
      enableRvaAdjustment: parseBoolean(
        request.query.enableRvaAdjustment,
        true
      )
    });

    if (result.row === null) {
      response.status(404).json({
        message: `No WR prospect evaluation found for prospectId ${prospectId}.`,
        methodology: result.methodology,
        activeFilterSummary: result.activeFilterSummary,
        optionalTeamContext: result.optionalTeamContext
      });
      return;
    }

    response.status(200).json(result);
  }
}