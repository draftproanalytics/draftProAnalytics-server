// src/application/playoffs/mappers/PlayoffBracketToEventsMapper.ts

import type { PlayoffBracket } from '@/domain/playoffs/valueObjects/PlayoffBracket';
import type { PlayoffMatchup } from '@/domain/playoffs/valueObjects/PlayoffTypes';
import { PlayoffBracketEventDto } from '../dtos/PlayoffBracketEventDto';


export interface PlayoffBracketToEventsMapper {
  id: number | string;
  date: string | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeWinner: boolean;
  awayWinner: boolean;
  status: string;
  homeSeed: number | null;
  awaySeed: number | null;
  isPlayoff: boolean;
  playoffRound: 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPERBOWL';
  playoffConference: 'AFC' | 'NFC' | null;
  homeTeamDbId: number | null;
  awayTeamDbId: number | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeTeamConference?: string | null;
  awayTeamConference?: string | null;
}

function roundToDto(r: string): 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPERBOWL' {
  if (r === 'WILDCARD') return 'WILDCARD';
  if (r === 'DIVISIONAL') return 'DIVISIONAL';
  if (r === 'CONFERENCE') return 'CONFERENCE';
  if (r === 'SUPERBOWL') return 'SUPERBOWL';
  return 'WILDCARD';
}

// Update PlayoffBracketToEventsMapper.ts

function matchupToEvent(m: PlayoffMatchup): PlayoffBracketEventDto {
  const hasScores = m.homeScore !== null && m.awayScore !== null;
  const status = hasScores ? 'Final' : 'Scheduled';
  
  const homeWinner = hasScores && m.winnerTeamId === m.homeTeamId;
  const awayWinner = hasScores && m.winnerTeamId === m.awayTeamId;

  return {
    id: m.gameId ?? Number(`${m.slot}`),
    date: m.gameDate?.toISOString() ?? null,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    awayTeamName: m.awayTeamName ? m.awayTeamName : '',
    homeTeamName: m.homeTeamName ? m.homeTeamName : '',
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homeWinner,
    awayWinner,
    status,
    homeSeed: m.homeSeed,
    awaySeed: m.awaySeed,
    isPlayoff: true,
    playoffRound: roundToDto(m.round),
    playoffConference: m.round === 'SUPERBOWL' 
      ? null 
      : (m.homeTeamConference === m.awayTeamConference && m.homeTeamConference 
      ? m.homeTeamConference as 'AFC' | 'NFC'
      : m.conference),
    homeTeamDbId: m.homeTeamId,
    awayTeamDbId: m.awayTeamId,
    homeTeamConference: m.homeTeamConference ? m.homeTeamConference : '',
    awayTeamConference: m.awayTeamConference ? m.awayTeamConference : '',
  };
}

export function bracketToEvents(bracket: PlayoffBracket): PlayoffBracketEventDto[] {
  const events: PlayoffBracketEventDto[] = [];

  // AFC rounds
  for (const round of bracket.afcRounds) {
    for (const matchup of round.matchups) {
      events.push(matchupToEvent(matchup));
    }
  }

  // NFC rounds
  for (const round of bracket.nfcRounds) {
    for (const matchup of round.matchups) {
      events.push(matchupToEvent(matchup));
    }
  }

  // Super Bowl
  if (bracket.superBowl) {
    events.push(matchupToEvent(bracket.superBowl));
  }

  return events;
}