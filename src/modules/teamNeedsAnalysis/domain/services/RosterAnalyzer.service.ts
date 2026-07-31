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
  private readonly EXPECTED_ROSTER_COUNTS: Readonly<Record<string, number>> = {
    QB: 3,
    RB: 6,
    WR: 9,
    TE: 5,
    OT: 6,
    IOL: 7,
    EDGE: 5,
    DT: 6,
    LB: 7,
    CB: 8,
    S: 6,
    K: 1,
    P: 1,
    LS: 1,
  };

  analyzePositionDepth(position: string, players: RosterPlayer[]): PositionDepthAnalysis {
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

    const position = players[0]?.position;
    const starters = players.filter((p) => p.isStarter);
    const backups = players.filter((p) => !p.isStarter);

    const starterQuality =
      starters.length > 0
        ? starters.reduce((sum, p) => sum + p.performanceGrade, 0) / starters.length
        : players.reduce((sum, p) => sum + p.performanceGrade, 0) / players.length;

    if (position === 'K' || position === 'P') {
      return Math.min(100, Math.max(0, starterQuality));
    }

    const backupQuality =
      backups.length > 0
        ? backups.reduce((sum, p) => sum + p.performanceGrade, 0) / backups.length
        : starterQuality * 0.75;

    const weightedQuality = starterQuality * 0.6 + backupQuality * 0.4;
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
      (p) => p.injuryStatus && ['OUT', 'INJURED_RESERVE', 'DOUBTFUL'].includes(p.injuryStatus)
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
    const expectedCount = this.EXPECTED_ROSTER_COUNTS[analysis.position] ?? 3;

    if (
      (analysis.position === 'K' || analysis.position === 'P') &&
      analysis.totalPlayers >= 1 &&
      analysis.averagePerformance >= 60 &&
      !analysis.contractExpiryConcern &&
      !analysis.injuryConcern
    ) {
      return 0;
    }

    let needScore = 0;
    const rosterRatio = expectedCount > 0 ? analysis.totalPlayers / expectedCount : 1;

    if (analysis.totalPlayers === 0) needScore += 30;
    else if (rosterRatio < 0.5) needScore += 25;
    else if (rosterRatio < 0.75) needScore += 15;
    else if (rosterRatio < 1) needScore += 8;

    const depthDeficit = 100 - analysis.depthQuality;
    needScore += (depthDeficit / 100) * 25;

    if (analysis.averagePerformance < 50) needScore += 20;
    else if (analysis.averagePerformance < 60) needScore += 15;
    else if (analysis.averagePerformance < 70) needScore += 10;

    if (analysis.ageingConcern) needScore += 10;
    if (analysis.contractExpiryConcern) needScore += 10;
    if (analysis.injuryConcern) needScore += 5;

    return Math.min(100, Math.max(0, needScore));
  }

  calculatePriority(needScore: number, positionImportance: number): number {
    // Position importance: QB=10, OL/DL=9, WR/CB=8, etc.
    // Priority = (needScore * 0.7) + (positionImportance * 0.3)
    const weightedScore = needScore * 0.7 + positionImportance * 3;
    return Math.min(10, Math.max(1, Math.round(weightedScore / 10)));
  }
}
