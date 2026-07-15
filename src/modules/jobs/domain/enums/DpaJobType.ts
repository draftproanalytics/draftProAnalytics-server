export const DpaJobType = {
  LoadNflSeasonSchedule: 'LOAD_NFL_SEASON_SCHEDULE',
  ImportNflGameScores: 'IMPORT_NFL_GAME_SCORES',
  LoadEspnDraftClassPlayers: 'LOAD_ESPN_DRAFT_CLASS_PLAYERS',
  LoadEspnDraftResults: 'LOAD_ESPN_DRAFT_RESULTS',
  ProcessJobQueue: 'PROCESS_JOB_QUEUE',
} as const;

export type DpaJobType = (typeof DpaJobType)[keyof typeof DpaJobType];

export const executableDpaJobTypes: readonly DpaJobType[] = [
  DpaJobType.LoadNflSeasonSchedule,
  DpaJobType.ImportNflGameScores,
  DpaJobType.LoadEspnDraftClassPlayers,
  DpaJobType.LoadEspnDraftResults,
];

export const isExecutableDpaJobType = (value: string): value is DpaJobType =>
  executableDpaJobTypes.includes(value as DpaJobType);
