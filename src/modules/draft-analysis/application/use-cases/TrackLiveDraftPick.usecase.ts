// src/modules/draft-analysis/application/use-cases/TrackLiveDraftPick.usecase.ts
import { ILiveDraftPickRepository } from '../../domain/repositories/ILiveDraftPickRepository';
import { ITeamDraftPatternRepository } from '../../domain/repositories/ITeamDraftPatternRepository';
import { LiveDraftPick } from '../../domain/entities/LiveDraftPick.entity';
import { GradeDraftPickUseCase } from './GradeDraftPick.usecase';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export interface TrackLiveDraftPickDto {
  year: number;
  round: number;
  pick: number;
  teamId: string;
  playerName: string;
  position: PositionGroup;
  college: string;
  consensusRanking: number;
}

export interface LiveDraftPickResult {
  pick: LiveDraftPick;
  grade: {
    grade: string;
    score: number;
    expectedSuccess: number;
    warnings: string[];
  };
  comparison: {
    prediction: PositionGroup | null;
    actualPosition: PositionGroup;
    wasExpected: boolean;
  };
}

export class TrackLiveDraftPickUseCase {
  constructor(
    private readonly liveDraftRepository: ILiveDraftPickRepository,
    private readonly gradeDraftPickUseCase: GradeDraftPickUseCase
  ) {}

  async execute(dto: TrackLiveDraftPickDto): Promise<LiveDraftPickResult> {
    // Find the live draft pick entry
    const overallPick = this.calculateOverallPick(dto.round, dto.pick);
    
    let livePick = await this.liveDraftRepository.findById(
      `${dto.year}-${dto.round}-${dto.pick}`
    );

    if (!livePick) {
      // Create new live pick if doesn't exist
      livePick = new LiveDraftPick(
        `${dto.year}-${dto.round}-${dto.pick}`,
        dto.year,
        dto.round,
        dto.pick,
        overallPick,
        dto.teamId,
        dto.teamId,
        'upcoming'
      );
    }

    // Grade the pick
    const gradeResult = await this.gradeDraftPickUseCase.execute({
      teamId: dto.teamId,
      round: dto.round,
      pick: dto.pick,
      position: dto.position,
      playerName: dto.playerName,
      consensusRanking: dto.consensusRanking
    });

    // Mark as completed
    livePick.markAsCompleted(
      dto.playerName,
      dto.position,
      dto.college,
      gradeResult.grade
    );

    // Save
    await this.liveDraftRepository.update(livePick);

    return {
      pick: livePick,
      grade: {
        grade: gradeResult.grade.grade,
        score: gradeResult.grade.score,
        expectedSuccess: gradeResult.expectedSuccess,
        warnings: gradeResult.warnings
      },
      comparison: {
        prediction: null, // Would come from prediction engine
        actualPosition: dto.position,
        wasExpected: false // Compare against prediction
      }
    };
  }

  private calculateOverallPick(round: number, pick: number): number {
    const picksPerRound = 32; // NFL standard
    return ((round - 1) * picksPerRound) + pick;
  }
}