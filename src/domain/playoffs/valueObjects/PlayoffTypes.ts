// src/domain/playoffs/valueObjects/PlayoffTypes.ts
export type PlayoffRound = 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPERBOWL';
export type PlayoffConference = 'AFC' | 'NFC';

export interface PlayoffMatchup {
  gameId: number | null;
  seasonYear: number;
  round: PlayoffRound;
  conference: PlayoffConference;
  slot: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeSeed: number | null;
  awaySeed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: number | null;
  gameDate: Date | null;
  // ✅ MUST have ? to be optional
  homeTeamName?: string | null;            // ← Question mark!
  awayTeamName?: string | null;       // ← Question mark!
  homeTeamConference?: string | null; // ← Question mark!
  awayTeamConference?: string | null; // ← Question mark!
}

