// src/modules/draft-analysis/domain/services/DraftPatternAnalyzer.service.ts
import { HistoricalDraftPick } from '../entities/HistoricalDraftPick.entity';
import { TeamDraftPattern } from '../entities/TeamDraftPattern.entity';
import { PositionGroup, PositionGroupMetrics } from '../value-objects/PositionGroup.vo';

export class DraftPatternAnalyzerService {
  analyzeTeamPattern(
    teamId: string,
    historicalPicks: HistoricalDraftPick[],
    regimeStartYear: number,
    generalManager: string,
    headCoach: string
  ): TeamDraftPattern {
    const positionMetrics = this.calculatePositionMetrics(historicalPicks);
    
    return new TeamDraftPattern(
      teamId,
      regimeStartYear,
      null,
      generalManager,
      headCoach,
      positionMetrics
    );
  }

  private calculatePositionMetrics(
    picks: HistoricalDraftPick[]
  ): Map<PositionGroup, PositionGroupMetrics> {
    const metricsMap = new Map<PositionGroup, PositionGroupMetrics>();
    
    // Group picks by position
    const picksByPosition = this.groupByPosition(picks);
    
    for (const [position, positionPicks] of picksByPosition.entries()) {
      const totalPicks = positionPicks.length;
      const successfulPicks = positionPicks.filter(p => p.isSuccessful()).length;
      const averageRound = positionPicks.reduce((sum, p) => sum + p.round, 0) / totalPicks;
      const preferredRounds = this.findPreferredRounds(positionPicks);
      const systemFitBias = this.detectSystemBias(positionPicks);
      
      metricsMap.set(
        position,
        new PositionGroupMetrics(
          position,
          totalPicks,
          successfulPicks,
          averageRound,
          preferredRounds,
          systemFitBias
        )
      );
    }
    
    return metricsMap;
  }

  private groupByPosition(
    picks: HistoricalDraftPick[]
  ): Map<PositionGroup, HistoricalDraftPick[]> {
    const grouped = new Map<PositionGroup, HistoricalDraftPick[]>();
    
    for (const pick of picks) {
      const existing = grouped.get(pick.positionGroup) ?? [];
      grouped.set(pick.positionGroup, [...existing, pick]);
    }
    
    return grouped;
  }

  private findPreferredRounds(picks: HistoricalDraftPick[]): number[] {
    const successByRound = new Map<number, { total: number; successful: number }>();
    
    for (const pick of picks) {
      const current = successByRound.get(pick.round) ?? { total: 0, successful: 0 };
      successByRound.set(pick.round, {
        total: current.total + 1,
        successful: current.successful + (pick.isSuccessful() ? 1 : 0)
      });
    }
    
    return Array.from(successByRound.entries())
      .filter(([_, stats]) => (stats.successful / stats.total) >= 0.4)
      .map(([round, _]) => round)
      .sort((a, b) => a - b);
  }

  private detectSystemBias(picks: HistoricalDraftPick[]): boolean {
    // System bias indicators:
    // 1. High number of picks (drafting same position repeatedly)
    // 2. Low success rate (system fit over talent)
    // 3. Similar physical profiles or college schemes
    
    const successRate = picks.filter(p => p.isSuccessful()).length / picks.length;
    const pickDensity = picks.length; // If > 8 picks in one position group, likely system-focused
    
    return pickDensity >= 8 && successRate < 0.30;
  }
}