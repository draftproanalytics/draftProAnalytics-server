// src/modules/draft-analysis/application/use-cases/GenerateDraftReport.usecase.ts
import { ILiveDraftPickRepository } from '../../domain/repositories/ILiveDraftPickRepository';
import { ITeamDraftPatternRepository } from '../../domain/repositories/ITeamDraftPatternRepository';
import { LiveDraftPick } from '../../domain/entities/LiveDraftPick.entity';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export interface GenerateDraftReportDto {
  teamId: string;
  year: number;
}

export interface DraftReportResult {
  teamId: string;
  year: number;
  totalPicks: number;
  overallGrade: string;
  averagePickGrade: number;
  picks: {
    round: number;
    pick: number;
    playerName: string;
    position: PositionGroup;
    grade: string;
    score: number;
  }[];
  positionBreakdown: {
    position: PositionGroup;
    count: number;
    averageGrade: number;
  }[];
  strengths: string[];
  concerns: string[];
  historicalComparison: {
    betterThanAverage: boolean;
    percentile: number;
  };
}

export class GenerateDraftReportUseCase {
  constructor(
    private readonly liveDraftRepository: ILiveDraftPickRepository,
    private readonly patternRepository: ITeamDraftPatternRepository
  ) {}

  async execute(dto: GenerateDraftReportDto): Promise<DraftReportResult> {
    const picks = await this.liveDraftRepository.findByTeam(dto.teamId, dto.year);
    const pattern = await this.patternRepository.findByTeamId(dto.teamId);

    const completedPicks = picks.filter(p => p.isCompleted());
    
    const averageGrade = completedPicks.reduce((sum, p) => sum + p.getGradeValue(), 0) / 
                        (completedPicks.length || 1);

    const overallGrade = this.calculateOverallGrade(averageGrade);
    
    const positionBreakdown = this.calculatePositionBreakdown(completedPicks);
    
    const strengths = this.identifyStrengths(completedPicks, pattern);
    const concerns = this.identifyConcerns(completedPicks, pattern);

    return {
      teamId: dto.teamId,
      year: dto.year,
      totalPicks: completedPicks.length,
      overallGrade,
      averagePickGrade: averageGrade,
      picks: completedPicks.map(p => ({
        round: p.round,
        pick: p.pick,
        playerName: p.playerName!,
        position: p.position!,
        grade: p.grade!.grade,
        score: p.grade!.score
      })),
      positionBreakdown,
      strengths,
      concerns,
      historicalComparison: {
        betterThanAverage: averageGrade > 70,
        percentile: this.calculatePercentile(averageGrade)
      }
    };
  }

  private calculateOverallGrade(averageScore: number): string {
    if (averageScore >= 90) return 'A+';
    if (averageScore >= 80) return 'A';
    if (averageScore >= 70) return 'B';
    if (averageScore >= 60) return 'C';
    if (averageScore >= 50) return 'D';
    return 'F';
  }

  private calculatePositionBreakdown(picks: LiveDraftPick[]) {
    const breakdown = new Map<PositionGroup, { count: number; totalGrade: number }>();

    for (const pick of picks) {
      if (!pick.position || !pick.grade) continue;

      const current = breakdown.get(pick.position) ?? { count: 0, totalGrade: 0 };
      breakdown.set(pick.position, {
        count: current.count + 1,
        totalGrade: current.totalGrade + pick.grade.score
      });
    }

    return Array.from(breakdown.entries()).map(([position, data]) => ({
      position,
      count: data.count,
      averageGrade: data.totalGrade / data.count
    }));
  }

  private identifyStrengths(picks: LiveDraftPick[], pattern: any): string[] {
    const strengths: string[] = [];
    
    const highGradePicks = picks.filter(p => p.getGradeValue() >= 80);
    if (highGradePicks.length >= 2) {
      strengths.push(`${highGradePicks.length} excellent value picks`);
    }

    return strengths;
  }

  private identifyConcerns(picks: LiveDraftPick[], pattern: any): string[] {
    const concerns: string[] = [];
    
    const lowGradePicks = picks.filter(p => p.getGradeValue() < 50);
    if (lowGradePicks.length >= 2) {
      concerns.push(`${lowGradePicks.length} questionable reaches`);
    }

    return concerns;
  }

  private calculatePercentile(score: number): number {
    // Simplified percentile calculation
    return Math.min(99, Math.max(1, Math.round((score / 100) * 100)));
  }
}