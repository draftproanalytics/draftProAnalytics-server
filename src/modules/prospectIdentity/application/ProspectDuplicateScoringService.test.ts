import { describe, expect, it } from 'vitest';
import { ProspectDuplicateScoringService, normalizeProspectName, scoreProviderNameMatch } from './ProspectDuplicateScoringService';

describe('ProspectDuplicateScoringService', () => {
  const service = new ProspectDuplicateScoringService();
  it('normalizes suffix punctuation deterministically', () => {
    expect(normalizeProspectName('Omar Cooper Jr.')).toBe('omar cooper jr');
  });
  it('ranks same-name/same-class prospects as candidates', () => {
    const result = service.score(
      { firstName:'Omar', lastName:'Cooper Jr.', position:'WR', college:'Indiana', draftYear:2026 },
      { firstName:'Omar', lastName:'Cooper Jr', position:'WR', college:'Indiana', draftYear:2026 },
    );
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toContain('LAST_NAME_EXACT');
  });
  it('does not treat KC and Kevin as an exact provider identity', () => {
    expect(scoreProviderNameMatch('KC Concepcion', 'Kevin Concepcion')).toBeLessThan(100);
  });
});
