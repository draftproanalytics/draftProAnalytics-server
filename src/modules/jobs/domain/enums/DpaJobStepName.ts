export const DpaJobStepName = {
  FetchNflEvents: 'FETCH_NFL_EVENTS',
  ResolveTeams: 'RESOLVE_TEAMS',
  UpsertGames: 'UPSERT_GAMES',
  SummarizeResult: 'SUMMARIZE_RESULT',
} as const;

export type DpaJobStepName = (typeof DpaJobStepName)[keyof typeof DpaJobStepName];
