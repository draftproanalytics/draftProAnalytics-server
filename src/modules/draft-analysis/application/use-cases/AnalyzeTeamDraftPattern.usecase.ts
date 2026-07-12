// src/modules/draft-analysis/application/use-cases/AnalyzeTeamDraftPattern.usecase.ts
import { IHistoricalDraftPickRepository } from '../../domain/repositories/IHistoricalDraftPickRepository';
import { DraftPatternAnalyzerService } from '../../domain/services/DraftPatternAnalyzer.service';
import { TeamDraftPattern } from '../../domain/entities/TeamDraftPattern.entity';

export interface AnalyzeTeamDraftPatternDto {
  teamId: string;
  regimeStartYear: number;
  generalManager: string;
  headCoach: string;
}

export class AnalyzeTeamDraftPatternUseCase {
  constructor(
    private readonly historicalPickRepository: IHistoricalDraftPickRepository,
    private readonly patternAnalyzer: DraftPatternAnalyzerService
  ) {}

  async execute(dto: AnalyzeTeamDraftPatternDto): Promise<TeamDraftPattern> {
    const historicalPicks = await this.historicalPickRepository.findByTeamAndYearRange(
      dto.teamId,
      dto.regimeStartYear,
      new Date().getFullYear()
    );

    return this.patternAnalyzer.analyzeTeamPattern(
      dto.teamId,
      historicalPicks,
      dto.regimeStartYear,
      dto.generalManager,
      dto.headCoach
    );
  }
}