export const DpaJobType = {
  LoadNflSeasonSchedule: 'LOAD_NFL_SEASON_SCHEDULE',
  ImportNflGameScores: 'IMPORT_NFL_GAME_SCORES',
  LoadEspnDraftClassPlayers: 'LOAD_ESPN_DRAFT_CLASS_PLAYERS',
  
  LoadEspnDraftResults: 'LOAD_ESPN_DRAFT_RESULTS',
  EnrichPlayerTeamPositions: 'ENRICH_PLAYER_TEAM_POSITIONS',
  SyncEspnDraftPicksToDpa: 'SYNC_ESPN_DRAFT_PICKS_TO_DPA',
  LoadEspnTeamRosters: 'LOAD_ESPN_TEAM_ROSTERS',
  SyncPostSeasonResultsFromGames: 'SYNC_POSTSEASON_RESULTS_FROM_GAMES',
  ProcessJobQueue: 'PROCESS_JOB_QUEUE',
} as const;

export type DpaJobType = (typeof DpaJobType)[keyof typeof DpaJobType];

export const executableDpaJobTypes: readonly DpaJobType[] = [
  DpaJobType.LoadNflSeasonSchedule,
  DpaJobType.ImportNflGameScores,
  DpaJobType.LoadEspnDraftClassPlayers,
  DpaJobType.LoadEspnDraftResults,
  DpaJobType.EnrichPlayerTeamPositions,
  DpaJobType.SyncEspnDraftPicksToDpa,
  DpaJobType.LoadEspnTeamRosters,
  DpaJobType.SyncPostSeasonResultsFromGames,
];

export const isExecutableDpaJobType = (value: string): value is DpaJobType =>
  executableDpaJobTypes.includes(value as DpaJobType);
