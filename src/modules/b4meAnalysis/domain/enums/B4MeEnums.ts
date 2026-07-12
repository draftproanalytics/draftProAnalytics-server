export const B4ME_POSITION_GROUPS = ['WR', 'ED', 'OT', 'DT', 'CB'] as const;
export type B4MePositionGroup = (typeof B4ME_POSITION_GROUPS)[number];

export const B4ME_SCORING_MODES = ['BASE', 'ENHANCED', 'DECISION_VIEW'] as const;
export type B4MeScoringMode = (typeof B4ME_SCORING_MODES)[number];

export const B4ME_VALIDATION_STATUSES = [
  'UNVALIDATED',
  'PARTIALLY_VALIDATED',
  'VALIDATED',
  'DEPRECATED'
] as const;
export type B4MeValidationStatus = (typeof B4ME_VALIDATION_STATUSES)[number];
