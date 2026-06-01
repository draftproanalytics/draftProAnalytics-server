import { describe, expect, it } from 'vitest';
import { B4MeDeterministicScoreService } from '../application/services/B4MeDeterministicScoreService';

const baseRow = {
  prospectId: '1',
  playerName: 'Example Prospect',
  draftYear: 2026,
  positionGroup: 'WR' as const,
  baseScore: 70,
  enhancedScore: 80,
  coachability: 8,
  rfa: 6,
  rva: 7,
  evaluationNotes: null
};

describe('B4MeDeterministicScoreService', () => {
  it('builds a deterministic decision-view score when enabled', () => {
    const service = new B4MeDeterministicScoreService();
    const result = service.buildDecisionViewScore(baseRow, true);

    expect(result).toBe(85.3);
  });

  it('returns enhanced score when decision view is disabled', () => {
    const service = new B4MeDeterministicScoreService();
    const result = service.buildDecisionViewScore(baseRow, false);

    expect(result).toBe(80);
  });

  it('labels scores consistently', () => {
    const service = new B4MeDeterministicScoreService();

    expect(service.buildScoreLabel(91)).toBe('Elite');
    expect(service.buildScoreLabel(84)).toBe('Strong');
    expect(service.buildScoreLabel(72)).toBe('Viable');
    expect(service.buildScoreLabel(65)).toBe('Developmental');
  });
});
