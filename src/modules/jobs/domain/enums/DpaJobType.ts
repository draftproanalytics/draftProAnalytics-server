export const DpaJobType = {
  LoadNflSeasonSchedule: 'LOAD_NFL_SEASON_SCHEDULE',
  ImportNflGameScores: 'IMPORT_NFL_GAME_SCORES',
  ProcessJobQueue: 'PROCESS_JOB_QUEUE',
} as const;

export type DpaJobType = (typeof DpaJobType)[keyof typeof DpaJobType];

export const executableDpaJobTypes: readonly DpaJobType[] = [
  DpaJobType.LoadNflSeasonSchedule,
  DpaJobType.ImportNflGameScores,
];

export const isExecutableDpaJobType = (value: string): value is DpaJobType =>
  executableDpaJobTypes.includes(value as DpaJobType);
