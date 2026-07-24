import { describe, expect, it } from 'vitest';
import { EvaluateWrProspectService } from '../../src/modules/postDraftReport/application/EvaluateWrProspectService';

const service = new EvaluateWrProspectService();

describe('EvaluateWrProspectService', () => {
  it('produces a strong complete-data WR evaluation', () => {
    const result = service.evaluate({
      metrics: {
        yprr: 3.2, pffOverallGrade: 87, contestedCatchRate: 54, behindLosTargetRate: 12, catchRate: 73.21,
        receptions: 82, targets: 112, missedTacklesForcedPerReception: 0.24,
        yacAfterContactPerReception: 2.8, routesRun: 420, gamesPlayed: 13, sourceMetadata: null, provenance: null, resolvedRecordIds: []
      },
      athleticScore: 83, b4meScore: 86, consensusRank: 25
    });
    expect(result.score).toBeGreaterThan(70);
    expect(result.dataConfidence).toBe(100);
    expect(result.missingMetrics).toHaveLength(0);
  });

  it('does not treat missing metrics as zero', () => {
    const result = service.evaluate({
      metrics: {
        yprr: 3.1, pffOverallGrade: null, contestedCatchRate: null, behindLosTargetRate: null, catchRate: null,
        receptions: null, targets: null, missedTacklesForcedPerReception: null,
        yacAfterContactPerReception: null, routesRun: null, gamesPlayed: null, sourceMetadata: null, provenance: null, resolvedRecordIds: []
      },
      athleticScore: null, b4meScore: null, consensusRank: null
    });
    expect(result.score).toBeGreaterThan(60);
    expect(result.dataConfidence).toBeLessThan(40);
    expect(result.missingMetrics).toContain('advanced receiving grade');
  });
});
