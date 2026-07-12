// src/modules/teamNeedsAnalysis/domain/services/RosterAnalyzer.service.ts

import { PositionGroup } from '../value-objects/PositionGroup.vo';

export interface RosterPlayer {
  position: string;
  positionGroup: string;
  depthChartOrder: number;
  age: number;
  yearsExperience: number;
  performanceGrade: number;
  isStarter: boolean;
  contractYearsRemaining: number;
  injuryStatus?: string;
}

export interface PositionDepthAnalysis {
  position: string;
  positionGroup: string;
  totalPlayers: number;
  starterCount: number;
  averageAge: number;
  averageExperience: number;
  averagePerformance: number;
  depthQuality: number; // 0-100
  ageingConcern: boolean;
  contractExpiryConcern: boolean;
  injuryConcern: boolean;
}

export class RosterAnalyzerService {
  private readonly STARTER_PERFORMANCE_THRESHOLD = 65;
  private readonly DEPTH_PERFORMANCE_THRESHOLD = 55;
  private readonly AGING_THRESHOLD = 30;
  private readonly CONTRACT_EXPIRY_THRESHOLD = 1;

  analyzePositionDepth(
    position: string,
    players: RosterPlayer[]
  ): PositionDepthAnalysis {
    const positionPlayers = players.filter((p) => p.position === position);

    if (positionPlayers.length === 0) {
      return this.createEmptyAnalysis(position);
    }

    const starters = positionPlayers.filter((p) => p.isStarter);
    const totalAge = positionPlayers.reduce((sum, p) => sum + p.age, 0);
    const totalExperience = positionPlayers.reduce((sum, p) => sum + p.yearsExperience, 0);
    const totalPerformance = positionPlayers.reduce((sum, p) => sum + p.performanceGrade, 0);

    const depthQuality = this.calculateDepthQuality(positionPlayers);
    const ageingConcern = this.hasAgeingConcern(positionPlayers);
    const contractExpiryConcern = this.hasContractExpiryConcern(positionPlayers);
    const injuryConcern = this.hasInjuryConcern(positionPlayers);

    return {
      position,
      positionGroup: PositionGroup.getGroupName(position),
      totalPlayers: positionPlayers.length,
      starterCount: starters.length,
      averageAge: totalAge / positionPlayers.length,
      averageExperience: totalExperience / positionPlayers.length,
      averagePerformance: totalPerformance / positionPlayers.length,
      depthQuality,
      ageingConcern,
      contractExpiryConcern,
      injuryConcern,
    };
  }

  private calculateDepthQuality(players: RosterPlayer[]): number {
    if (players.length === 0) return 0;

    const starters = players.filter((p) => p.isStarter);
    const backups = players.filter((p) => !p.isStarter);

    // Starter quality (60% weight)
    const starterQuality =
      starters.length > 0
        ? starters.reduce((sum, p) => sum + p.performanceGrade, 0) / starters.length
        : 0;

    // Backup quality (40% weight)
    const backupQuality =
      backups.length > 0
        ? backups.reduce((sum, p) => sum + p.performanceGrade, 0) / backups.length
        : 0;

    const weightedQuality = starterQuality * 0.6 + backupQuality * 0.4;

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, weightedQuality));
  }

  private hasAgeingConcern(players: RosterPlayer[]): boolean {
    const starters = players.filter((p) => p.isStarter);
    if (starters.length === 0) return false;

    const oldStarters = starters.filter((p) => p.age >= this.AGING_THRESHOLD);
    return oldStarters.length / starters.length > 0.5; // More than 50% of starters are old
  }

  private hasContractExpiryConcern(players: RosterPlayer[]): boolean {
    const starters = players.filter((p) => p.isStarter);
    if (starters.length === 0) return false;

    const expiringStarters = starters.filter(
      (p) => p.contractYearsRemaining <= this.CONTRACT_EXPIRY_THRESHOLD
    );
    return expiringStarters.length / starters.length > 0.5; // More than 50% expiring soon
  }

  private hasInjuryConcern(players: RosterPlayer[]): boolean {
    const injuredPlayers = players.filter(
      (p) =>
        p.injuryStatus &&
        ['OUT', 'INJURED_RESERVE', 'DOUBTFUL'].includes(p.injuryStatus)
    );
    return injuredPlayers.length > 0;
  }

  private createEmptyAnalysis(position: string): PositionDepthAnalysis {
    return {
      position,
      positionGroup: PositionGroup.getGroupName(position),
      totalPlayers: 0,
      starterCount: 0,
      averageAge: 0,
      averageExperience: 0,
      averagePerformance: 0,
      depthQuality: 0,
      ageingConcern: false,
      contractExpiryConcern: false,
      injuryConcern: false,
    };
  }

  calculateNeedScore(analysis: PositionDepthAnalysis): number {
    let needScore = 0;

    // Lack of players (30 points max)
    if (analysis.totalPlayers === 0) {
      needScore += 30;
    } else if (analysis.totalPlayers === 1) {
      needScore += 25;
    } else if (analysis.totalPlayers === 2) {
      needScore += 15;
    }

    // Poor depth quality (25 points max)
    const depthDeficit = 100 - analysis.depthQuality;
    needScore += (depthDeficit / 100) * 25;

    // Low performance (20 points max)
    if (analysis.averagePerformance < 50) {
      needScore += 20;
    } else if (analysis.averagePerformance < 60) {
      needScore += 15;
    } else if (analysis.averagePerformance < 70) {
      needScore += 10;
    }

    // Aging concern (10 points max)
    if (analysis.ageingConcern) {
      needScore += 10;
    }

    // Contract expiry (10 points max)
    if (analysis.contractExpiryConcern) {
      needScore += 10;
    }

    // Injury concern (5 points max)
    if (analysis.injuryConcern) {
      needScore += 5;
    }

    return Math.min(100, Math.max(0, needScore));
  }

  calculatePriority(needScore: number, positionImportance: number): number {
    // Position importance: QB=10, OL/DL=9, WR/CB=8, etc.
    // Priority = (needScore * 0.7) + (positionImportance * 0.3)
    const weightedScore = needScore * 0.7 + positionImportance * 3;
    return Math.min(10, Math.max(1, Math.round(weightedScore / 10)));
  }
}