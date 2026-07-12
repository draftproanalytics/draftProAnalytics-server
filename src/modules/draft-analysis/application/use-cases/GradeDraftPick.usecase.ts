// src/modules/draft-analysis/application/use-cases/GradeDraftPick.usecase.ts
import { ITeamDraftPatternRepository } from '../../domain/repositories/ITeamDraftPatternRepository';
import { DraftGrade } from '../../domain/value-objects/DraftGrade.vo';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export interface GradeDraftPickDto {
  teamId: string;
  round: number;
  pick: number;
  position: PositionGroup;
  playerName: string;
  consensusRanking: number; // Where player was ranked overall
}

export interface DraftPickGradeResult {
  grade: DraftGrade;
  expectedSuccess: number;
  historicalContext: string;
  valueAnalysis: string;
  warnings: string[];
}

export class GradeDraftPickUseCase {
  constructor(
    private readonly patternRepository: ITeamDraftPatternRepository
  ) {}

  async execute(dto: GradeDraftPickDto): Promise<DraftPickGradeResult> {
    const pattern = await this.patternRepository.findByTeamId(dto.teamId);
    if (!pattern) {
      throw new Error(`No pattern found for team ${dto.teamId}`);
    }

    const metrics = pattern.getMetricsForPosition(dto.position);
    const warnings: string[] = [];

    // Calculate historical success rate for this position
    const historicalSuccessRate = metrics?.successRate ?? 0;
    
    // Calculate positional alignment
    const isPreferredPosition = pattern.getBestDraftingPositions().includes(dto.position);
    const isWeakPosition = pattern.getWorstDraftingPositions().includes(dto.position);
    let positionalAlignment = 50;
    
    if (isPreferredPosition) {
      positionalAlignment = 85;
    } else if (isWeakPosition) {
      positionalAlignment = 25;
      warnings.push(`Team has poor history drafting ${dto.position} (${historicalSuccessRate.toFixed(1)}% success rate)`);
    }

    if (metrics?.systemFitBias) {
      warnings.push(`Team tends to draft ${dto.position} for system fit over talent - high bust risk`);
      positionalAlignment *= 0.8;
    }

    // Calculate draft value (did they reach or get value?)
    const expectedPick = dto.consensusRanking;
    const actualPick = dto.pick;
    const valueScore = Math.max(0, Math.min(100, 50 + ((expectedPick - actualPick) * 2)));

    if (valueScore < 30) {
      warnings.push(`Significant reach - player ranked #${expectedPick} taken at #${actualPick}`);
    } else if (valueScore > 70) {
      warnings.push(`Great value - player ranked #${expectedPick} available at #${actualPick}`);
    }

    const grade = DraftGrade.calculate(
      historicalSuccessRate,
      positionalAlignment,
      valueScore
    );

    const expectedSuccess = this.calculateExpectedSuccess(
      dto.round,
      historicalSuccessRate,
      valueScore
    );

    return {
      grade,
      expectedSuccess,
      historicalContext: this.buildHistoricalContext(pattern, dto.position, metrics),
      valueAnalysis: this.buildValueAnalysis(expectedPick, actualPick, valueScore),
      warnings
    };
  }

  private calculateExpectedSuccess(
    round: number,
    historicalRate: number,
    valueScore: number
  ): number {
    // Base success rate by round (league average)
    const baseRate = round === 1 ? 60 : round === 2 ? 40 : round === 3 ? 30 : 20;
    
    // Adjust by team's historical performance
    const teamAdjustment = (historicalRate - 30) * 0.5; // 30% is league average
    
    // Adjust by value score
    const valueAdjustment = (valueScore - 50) * 0.3;
    
    return Math.max(0, Math.min(100, baseRate + teamAdjustment + valueAdjustment));
  }

  private buildHistoricalContext(
    pattern: any,
    position: PositionGroup,
    metrics: any
  ): string {
    if (!metrics) {
      return `${pattern.teamId} has not drafted ${position} frequently in this regime.`;
    }

    const competency = metrics.draftCompetency;
    const successRate = metrics.successRate.toFixed(1);
    const totalPicks = metrics.totalPicks;

    return `${pattern.generalManager} has drafted ${totalPicks} ${position}s since ${pattern.regimeStartYear} with ${successRate}% success rate (${competency} grade). ${metrics.systemFitBias ? 'Team shows strong system-fit bias at this position.' : ''}`;
  }

  private buildValueAnalysis(
    consensusRank: number,
    actualPick: number,
    valueScore: number
  ): string {
    const diff = actualPick - consensusRank;
    
    if (diff > 20) {
      return `SIGNIFICANT REACH: Player ranked #${consensusRank} taken at #${actualPick} (+${diff} picks)`;
    } else if (diff > 10) {
      return `Moderate reach: Player ranked #${consensusRank} taken at #${actualPick} (+${diff} picks)`;
    } else if (diff < -20) {
      return `EXCELLENT VALUE: Player ranked #${consensusRank} fell to #${actualPick} (${diff} picks)`;
    } else if (diff < -10) {
      return `Good value: Player ranked #${consensusRank} available at #${actualPick} (${diff} picks)`;
    } else {
      return `Fair value: Player ranked #${consensusRank} taken at #${actualPick}`;
    }
  }
}