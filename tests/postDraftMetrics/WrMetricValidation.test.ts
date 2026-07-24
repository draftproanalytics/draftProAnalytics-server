import { describe, expect, it } from 'vitest';
import { validateWrMetricCommand } from '../../src/modules/postDraftMetrics/application/WrMetricValidation';

const valid = {
  prospectId: 123, draftYear: 2026, seasonYear: 2025, sourceName: 'Manual Entry', sourceType: 'MANUAL' as const,
  yardsPerRouteRun: 3.12, receivingGrade: 86.4, contestedCatchRate: 52.1, behindLosTargetRate: 13.4,
  catchRate: 71.8, missedTacklesForcedPerReception: 0.18, yacAfterContactPerReception: 3.7,
};

describe('validateWrMetricCommand', () => {
  it('accepts a valid command', () => expect(validateWrMetricCommand(valid, 2026)).toEqual([]));
  it('rejects out-of-range values without clamping', () => {
    const errors = validateWrMetricCommand({ ...valid, yardsPerRouteRun: 12, receivingGrade: -1 }, 2026);
    expect(errors.map((error) => error.field)).toEqual(expect.arrayContaining(['yardsPerRouteRun', 'receivingGrade']));
  });
  it('requires at least one metric', () => {
    const errors = validateWrMetricCommand({ prospectId: 1, draftYear: 2026, seasonYear: 2025, sourceName: 'x', sourceType: 'MANUAL' }, 2026);
    expect(errors.some((error) => error.field === 'metrics')).toBe(true);
  });
  it('rejects a materially later season year', () => {
    expect(validateWrMetricCommand({ ...valid, seasonYear: 2028 }, 2026).some((error) => error.field === 'seasonYear')).toBe(true);
  });
});
