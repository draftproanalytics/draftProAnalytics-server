const suffixes = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

export const normalizeProspectName = (value: string): string =>
  value.toLowerCase().replace(/[.'’]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeTokens = (value: string): string[] =>
  normalizeProspectName(value).split(' ').filter((token) => token.length > 0 && !suffixes.has(token));

const firstInitialMatches = (a: string, b: string): boolean => a.length > 0 && b.length > 0 && a[0] === b[0];

export interface ScoreableProspect {
  readonly firstName: string;
  readonly lastName: string;
  readonly position: string;
  readonly college: string;
  readonly draftYear: number | null;
}

export class ProspectDuplicateScoringService {
  public score(left: ScoreableProspect, right: ScoreableProspect): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;
    const lf = normalizeTokens(left.firstName).join(' ');
    const rf = normalizeTokens(right.firstName).join(' ');
    const ll = normalizeTokens(left.lastName).join(' ');
    const rl = normalizeTokens(right.lastName).join(' ');

    if (ll === rl && ll.length > 0) { score += 45; reasons.push('LAST_NAME_EXACT'); }
    if (lf === rf && lf.length > 0) { score += 30; reasons.push('FIRST_NAME_EXACT'); }
    else if (firstInitialMatches(lf, rf)) { score += 12; reasons.push('FIRST_INITIAL_MATCH'); }
    if (left.draftYear !== null && left.draftYear === right.draftYear) { score += 10; reasons.push('DRAFT_YEAR_MATCH'); }
    if (normalizeProspectName(left.position) === normalizeProspectName(right.position)) { score += 8; reasons.push('POSITION_MATCH'); }
    if (normalizeProspectName(left.college) === normalizeProspectName(right.college) && left.college.trim().length > 0) { score += 7; reasons.push('COLLEGE_MATCH'); }

    return { score: Math.min(score, 100), reasons };
  }
}

export const scoreProviderNameMatch = (requested: string, resolved: string): number => {
  const req = normalizeProspectName(requested);
  const res = normalizeProspectName(resolved);
  if (req === res) return 100;
  const r = normalizeTokens(requested);
  const c = normalizeTokens(resolved);
  let score = 0;
  if (r.at(-1) && r.at(-1) === c.at(-1)) score += 40;
  if (r[0] && r[0] === c[0]) score += 25;
  else if (r[0] && c[0] && firstInitialMatches(r[0], c[0])) score += 10;
  if (req.includes(res) || res.includes(req)) score += 20;
  return Math.min(score, 100);
};
