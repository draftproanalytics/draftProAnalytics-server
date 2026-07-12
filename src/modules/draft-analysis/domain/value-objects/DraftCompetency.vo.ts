// src/modules/draft-analysis/domain/value-objects/DraftCompetency.vo.ts
export type DraftCompetencyLevel = 'Elite' | 'Good' | 'Average' | 'Poor' | 'Terrible';

export class DraftCompetency {
  private constructor(
    public readonly level: DraftCompetencyLevel,
    public readonly successRate: number
  ) {}

  static fromSuccessRate(successRate: number): DraftCompetency {
    let level: DraftCompetencyLevel;

    if (successRate >= 60) level = 'Elite';
    else if (successRate >= 40) level = 'Good';
    else if (successRate >= 25) level = 'Average';
    else if (successRate >= 15) level = 'Poor';
    else level = 'Terrible';

    return new DraftCompetency(level, successRate);
  }

  isCompetent(): boolean {
    return this.successRate >= 40;
  }

  shouldAvoidPosition(): boolean {
    return this.successRate < 25;
  }

  getConfidenceMultiplier(): number {
    switch (this.level) {
      case 'Elite': return 1.3;
      case 'Good': return 1.1;
      case 'Average': return 1.0;
      case 'Poor': return 0.8;
      case 'Terrible': return 0.6;
    }
  }
}