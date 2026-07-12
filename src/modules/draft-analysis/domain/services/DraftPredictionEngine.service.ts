// src/modules/draft-analysis/domain/services/DraftPredictionEngine.service.ts
import { TeamDraftPattern } from '../entities/TeamDraftPattern.entity';
import { DraftPickPrediction } from '../entities/DraftPickPrediction.entity';
import { PositionGroup } from '../value-objects/PositionGroup.vo';

interface TeamNeed {
  position: PositionGroup;
  severity: number; // 0-100
  starterQuality: number; // 0-100
  depthQuality: number; // 0-100;
}

export class DraftPredictionEngineService {
  predictDraftPick(
    teamPattern: TeamDraftPattern,
    teamNeeds: TeamNeed[],
    round: number,
    pick: number,
    year: number
  ): DraftPickPrediction {
    const predictions = this.calculatePositionProbabilities(
      teamPattern,
      teamNeeds,
      round
    );
    
    const avgNeed = teamNeeds.reduce((sum, n) => sum + n.severity, 0) / teamNeeds.length;
    const historicalTendency = this.calculateHistoricalTendency(teamPattern, predictions[0]?.position);
    
    return new DraftPickPrediction(
      teamPattern.teamId,
      round,
      pick,
      year,
      predictions,
      avgNeed,
      historicalTendency,
      this.isBestPlayerAvailableTeam(teamPattern)
    );
  }

  private calculatePositionProbabilities(
    pattern: TeamDraftPattern,
    needs: TeamNeed[],
    round: number
  ): { position: PositionGroup; probability: number; reasoning: string }[] {
    const scores: Map<PositionGroup, { score: number; factors: string[] }> = new Map();
    
    for (const need of needs) {
      const metrics = pattern.getMetricsForPosition(need.position);
      if (!metrics) continue;
      
      const factors: string[] = [];
      let score = 0;
      
      // Factor 1: Team need severity (40% weight)
      const needScore = need.severity * 0.4;
      score += needScore;
      if (need.severity >= 70) {
        factors.push(`Critical need (${need.severity}/100)`);
      }
      
      // Factor 2: Historical success at position (30% weight)
      const historyScore = metrics.successRate * 0.3;
      score += historyScore;
      if (metrics.successRate >= 40) {
        factors.push(`Good draft history (${metrics.successRate.toFixed(1)}% success)`);
      } else if (metrics.successRate < 25) {
        factors.push(`Poor draft history (${metrics.successRate.toFixed(1)}% success) - may avoid`);
        score *= 0.7; // Penalty for poor history
      }
      
      // Factor 3: Round preference (20% weight)
      const isPreferredRound = metrics.preferredRounds.includes(round);
      if (isPreferredRound) {
        score += 20;
        factors.push(`Team historically drafts ${need.position} in round ${round}`);
      }
      
      // Factor 4: System fit bias (10% weight, negative impact)
      if (metrics.systemFitBias) {
        score *= 0.85; // Reduce likelihood due to system bias leading to busts
        factors.push(`Team has system-over-talent bias at ${need.position}`);
      }
      
      // Factor 5: Recent draft history (bonus/penalty)
      const recentDrafts = this.getRecentDraftsAtPosition(pattern, need.position);
      if (recentDrafts >= 2) {
        score *= 0.6; // Less likely to draft same position again
        factors.push(`Drafted ${need.position} ${recentDrafts} times recently`);
      }
      
      scores.set(need.position, { score, factors });
    }
    
    // Normalize to probabilities
    const totalScore = Array.from(scores.values()).reduce((sum, s) => sum + s.score, 0);
    
    return Array.from(scores.entries())
      .map(([position, { score, factors }]) => ({
        position,
        probability: (score / totalScore) * 100,
        reasoning: factors.join('; ')
      }))
      .sort((a, b) => b.probability - a.probability);
  }

  private calculateHistoricalTendency(
    pattern: TeamDraftPattern,
    position?: PositionGroup
  ): number {
    if (!position) return 50;
    
    const metrics = pattern.getMetricsForPosition(position);
    if (!metrics) return 50;
    
    return Math.min(metrics.totalPicks * 8, 100); // More picks = stronger tendency
  }

  private isBestPlayerAvailableTeam(pattern: TeamDraftPattern): boolean {
    // BPA teams typically have:
    // - More even distribution across positions
    // - Higher success rates overall
    // - Less system bias
    
    const metrics = pattern.getAllMetrics();
    const avgSuccessRate = metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
    const hasSystemBias = metrics.some(m => m.systemFitBias);
    
    return avgSuccessRate >= 35 && !hasSystemBias;
  }

  private getRecentDraftsAtPosition(pattern: TeamDraftPattern, position: PositionGroup): number {
    // This would need to query actual recent picks
    // For now, return 0 as placeholder
    return 0;
  }
}