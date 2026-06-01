export type B4MeScoringMode = 'BASE_ONLY' | 'BASE_PLUS_CONTEXT' | 'FULL_DECISION_SCORE';

export const B4ME_SCORING_MODES: readonly B4MeScoringMode[] = [
  'BASE_ONLY',
  'BASE_PLUS_CONTEXT',
  'FULL_DECISION_SCORE'
] as const;
