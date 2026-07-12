import type { B4MeDecisionViewDimensions } from '../../domain/contracts/B4MeFrameworkContracts';

export interface RawPhaseThreeEvaluationRow {
  prospectId: string;
  playerName: string;
  draftYear: number | null;
  positionGroup: 'WR' | 'ED' | 'OT' | 'DT' | 'CB';
  baseScore: number;
  enhancedScore: number;
  coachability: number;
  rfa: number;
  rva: number;
  evaluationNotes?: string | null;
}

export class B4MeDeterministicScoreService {
  public buildDecisionViewDimensions(row: RawPhaseThreeEvaluationRow): B4MeDecisionViewDimensions {
    return {
      coachability: Number(row.coachability.toFixed(2)),
      rfa: Number(row.rfa.toFixed(2)),
      rva: Number(row.rva.toFixed(2))
    };
  }

  public buildDecisionViewScore(row: RawPhaseThreeEvaluationRow, decisionViewEnabled: boolean): number {
    if (!decisionViewEnabled) {
      return Number(row.enhancedScore.toFixed(2));
    }

    const modifier = (row.coachability * 0.2) + (row.rfa * 0.3) + (row.rva * 0.5);
    return Number((row.enhancedScore + modifier).toFixed(2));
  }

  public buildScoreLabel(score: number): string {
    if (score >= 90) {
      return 'Elite';
    }

    if (score >= 80) {
      return 'Strong';
    }

    if (score >= 70) {
      return 'Viable';
    }

    return 'Developmental';
  }
}
