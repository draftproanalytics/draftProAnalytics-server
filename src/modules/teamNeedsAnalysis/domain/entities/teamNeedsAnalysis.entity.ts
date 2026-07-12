// src/modules/teamNeedsAnalysis/domain/entities/TeamNeedsAnalysis.entity.ts

export interface PositionNeedScore {
  position: string;
  positionGroup: string;
  needScore: number; // 0-100 scale
  priority: number; // 1-10 scale
  reasoning: string[];
}

export interface TeamNeedsAnalysisData {
  teamId: number;
  seasonYear: number;
  analysisDate: Date;
  positionNeeds: PositionNeedScore[];
  overallNeedScore: number;
  topPriorities: string[]; // Top 3-5 positions
  metadata?: {
    rosterSize?: number;
    averageAge?: number;
    experienceLevel?: number;
    injuryCount?: number;
  };
}

export class TeamNeedsAnalysis {
  private constructor(
    public readonly teamId: number,
    public readonly seasonYear: number,
    public readonly analysisDate: Date,
    public readonly positionNeeds: PositionNeedScore[],
    public readonly overallNeedScore: number,
    public readonly topPriorities: string[],
    public readonly metadata?: TeamNeedsAnalysisData['metadata']
  ) {}

  static create(data: TeamNeedsAnalysisData): TeamNeedsAnalysis {
    this.validateData(data);

    return new TeamNeedsAnalysis(
      data.teamId,
      data.seasonYear,
      data.analysisDate,
      data.positionNeeds,
      data.overallNeedScore,
      data.topPriorities,
      data.metadata
    );
  }

  private static validateData(data: TeamNeedsAnalysisData): void {
    if (data.teamId <= 0) {
      throw new Error('Team ID must be positive');
    }

    if (data.seasonYear < 2000 || data.seasonYear > 2030) {
      throw new Error('Season year must be between 2000 and 2030');
    }

    if (data.positionNeeds.length === 0) {
      throw new Error('Position needs cannot be empty');
    }

    if (data.overallNeedScore < 0 || data.overallNeedScore > 100) {
      throw new Error('Overall need score must be between 0 and 100');
    }

    // Validate each position need
    data.positionNeeds.forEach((need) => {
      if (need.needScore < 0 || need.needScore > 100) {
        throw new Error(`Need score for ${need.position} must be between 0 and 100`);
      }
      if (need.priority < 1 || need.priority > 10) {
        throw new Error(`Priority for ${need.position} must be between 1 and 10`);
      }
    });
  }

  getHighPriorityNeeds(threshold: number = 7): PositionNeedScore[] {
    return this.positionNeeds.filter((need) => need.priority >= threshold);
  }

  getPositionNeed(position: string): PositionNeedScore | undefined {
    return this.positionNeeds.find((need) => need.position === position);
  }

  getNeedsByPositionGroup(group: string): PositionNeedScore[] {
    return this.positionNeeds.filter((need) => need.positionGroup === group);
  }

  getSortedNeedsByPriority(): PositionNeedScore[] {
    return [...this.positionNeeds].sort((a, b) => b.priority - a.priority);
  }

  getSortedNeedsByScore(): PositionNeedScore[] {
    return [...this.positionNeeds].sort((a, b) => b.needScore - a.needScore);
  }

  isPositionTopPriority(position: string): boolean {
    return this.topPriorities.includes(position);
  }

  hasUrgentNeeds(): boolean {
    return this.positionNeeds.some((need) => need.priority >= 9);
  }

  toJSON(): TeamNeedsAnalysisData {
    return {
      teamId: this.teamId,
      seasonYear: this.seasonYear,
      analysisDate: this.analysisDate,
      positionNeeds: this.positionNeeds,
      overallNeedScore: this.overallNeedScore,
      topPriorities: this.topPriorities,
      metadata: this.metadata,
    };
  }
}