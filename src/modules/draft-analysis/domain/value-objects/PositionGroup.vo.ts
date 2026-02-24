// src/modules/draft-analysis/domain/value-objects/PositionGroup.vo.ts
export enum PositionGroup {
  QUARTERBACK = 'QB',
  OFFENSIVE_LINE = 'OL',
  DEFENSIVE_LINE = 'DL',
  WIDE_RECEIVER = 'WR',
  RUNNING_BACK = 'RB',
  TIGHT_END = 'TE',
  LINEBACKER = 'LB',
  DEFENSIVE_BACK = 'DB',
  SPECIAL_TEAMS = 'ST'
}

export class PositionGroupMetrics {
  constructor(
    public readonly group: PositionGroup,
    public readonly totalPicks: number,
    public readonly successfulPicks: number,
    public readonly averageRound: number,
    public readonly preferredRounds: number[], // Rounds where team has most success
    public readonly systemFitBias: boolean // Does team draft for system over talent?
  ) {}

  get successRate(): number {
    return this.totalPicks === 0 ? 0 : (this.successfulPicks / this.totalPicks) * 100;
  }

  get draftCompetency(): 'Elite' | 'Good' | 'Average' | 'Poor' | 'Terrible' {
    if (this.successRate >= 60) return 'Elite';
    if (this.successRate >= 40) return 'Good';
    if (this.successRate >= 25) return 'Average';
    if (this.successRate >= 15) return 'Poor';
    return 'Terrible';
  }
}
