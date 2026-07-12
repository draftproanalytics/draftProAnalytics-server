// src/utils/schedule/scheduleTypes.ts

export type GameStatus = 'Scheduled' | 'In Progress' | 'Final' | 'Canceled' | 'Postponed';
export type PrimetimeType = 'TNF' | 'SNF' | 'MNF' | null;

export type PlayoffRound = 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPERBOWL'
export type PlayoffConference = 'AFC' | 'NFC'

export interface WeekScheduleDTO {
  year: number;       // e.g., 2025
  seasonType: number; // 1 = preseason, 2 = regular, 3 = postseason
  week: number;       // 1–18 (or 0 for preseason)
  events: NormalizedGameDTO[];
}

export interface EventDTO {
  id: number;
  date: string | null;
  name: string | null;
  shortName: string | null;
  status: string | null;
  seasonYear: number;
  seasonType: number;
  week: number;
  competitions?: any;
}

// NEW: Scoring play DTO
export interface ScoringPlayDTO {
  id: number;
  text: string;
  /** Quarter number (0 if unknown) */
  period: number;
  /** Clock display like "10:21" */
  clockDisplay: string;
  homeScore: number | null;
  awayScore: number | null;
  /** e.g. "Pass", "Rush", "FG", or null if ESPN doesn't provide it */
  type: string | null;
}
export interface NormalizedGameDTO {
  id: number
  date: string | null
  dateFormatted: {
    day: string;
    time: string;
  }

  homeTeamId: number | null      // ESPN team id
  homeTeamName: string
  homeScore: number | null
  homeWinner: boolean
  homeLogoLocal: string | null
  homeLogoEspn: string | null
  teamColorHome: string

  awayTeamId: number | null      // ESPN team id
  awayTeamName: string
  awayScore: number | null
  awayWinner: boolean
  awayLogoLocal: string | null
  awayLogoEspn: string | null
  teamColorAway: string

  status: GameStatus
  statusDetail: string

  isPrimetime: boolean
  primetimeType: string | null

  scoringSummaryShort: string | null
  scoringPlays: ScoringPlayDTO[]

  // ✅ ADD THESE (critical for bracket)
  homeSeed?: number | null
  awaySeed?: number | null

  // ✅ ADD THESE (server will set them in /playoffBracket route)
  isPlayoff?: boolean
  playoffRound?: PlayoffRound | null
  playoffConference?: PlayoffConference | null

  // ✅ ADD THESE (server enriches from Team table)
  homeTeamAbbrev?: string | null
  awayTeamAbbrev?: string | null
  homeTeamDbId?: number | null
  awayTeamDbId?: number | null
}
