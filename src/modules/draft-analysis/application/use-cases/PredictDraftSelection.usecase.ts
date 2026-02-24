// src/modules/draft-analysis/application/use-cases/PredictDraftSelection.usecase.ts
import { ITeamDraftPatternRepository } from '../../domain/repositories/ITeamDraftPatternRepository';
import { ITeamRosterRepository } from '../../domain/repositories/ITeamRosterRepository';
import { DraftPredictionEngineService } from '../../domain/services/DraftPredictionEngine.service';
import { DraftPickPrediction } from '../../domain/entities/DraftPickPrediction.entity';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export interface PredictDraftSelectionDto {
  teamId: string;
  round: number;
  pick: number;
  year: number;
}

export class PredictDraftSelectionUseCase {
  constructor(
    private readonly patternRepository: ITeamDraftPatternRepository,
    private readonly rosterRepository: ITeamRosterRepository,
    private readonly predictionEngine: DraftPredictionEngineService
  ) {}

  async execute(dto: PredictDraftSelectionDto): Promise<DraftPickPrediction> {
    const pattern = await this.patternRepository.findByTeamId(dto.teamId);
    if (!pattern) {
      throw new Error(`No draft pattern found for team ${dto.teamId}`);
    }

    const teamNeeds = await this.calculateTeamNeeds(dto.teamId);

    return this.predictionEngine.predictDraftPick(
      pattern,
      teamNeeds,
      dto.round,
      dto.pick,
      dto.year
    );
  }

  private async calculateTeamNeeds(teamId: string) {
    // This would analyze current roster, depth charts, aging players, etc.
    // For KC Chiefs example:
    return [
      {
        position: PositionGroup.OFFENSIVE_LINE,
        severity: 85, // Critical after Mahomes injury
        starterQuality: 65,
        depthQuality: 40
      },
      {
        position: PositionGroup.WIDE_RECEIVER,
        severity: 60,
        starterQuality: 70,
        depthQuality: 50
      },
      {
        position: PositionGroup.DEFENSIVE_LINE,
        severity: 70,
        starterQuality: 60,
        depthQuality: 45
      }
    ];
  }
}