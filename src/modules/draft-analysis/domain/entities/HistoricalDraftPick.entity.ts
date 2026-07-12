import { PositionGroup } from "../value-objects/PositionGroup.vo";

// src/modules/draft-analysis/domain/entities/HistoricalDraftPick.entity.ts
export class HistoricalDraftPick {
  constructor(
    public readonly id: string,
    public readonly year: number,
    public readonly round: number,
    public readonly pick: number,
    public readonly teamId: string,
    public readonly playerName: string,
    public readonly position: string,
    public readonly positionGroup: PositionGroup,
    public readonly careerGrade: 'Elite' | 'Starter' | 'Backup' | 'Bust' | 'TBD',
    public readonly yearsWithTeam: number,
    public readonly proBowl: number,
    public readonly allPro: number
  ) {}

  isSuccessful(): boolean {
    // Success criteria based on round
    if (this.round === 1) {
      return this.careerGrade === 'Elite' || this.careerGrade === 'Starter';
    }
    if (this.round <= 3) {
      return this.careerGrade !== 'Bust';
    }
    return this.careerGrade === 'Elite' || this.careerGrade === 'Starter';
  }

  getExpectedValue(): number {
    // Expected value based on draft position
    const baseValue = 100 - (this.pick * 0.5);
    const actualValue = this.getActualValue();
    return actualValue - baseValue; // Positive = exceeded expectations
  }

  private getActualValue(): number {
    switch (this.careerGrade) {
      case 'Elite': return 95;
      case 'Starter': return 70;
      case 'Backup': return 40;
      case 'Bust': return 10;
      case 'TBD': return 50; // Neutral for recent picks
    }
  }
}