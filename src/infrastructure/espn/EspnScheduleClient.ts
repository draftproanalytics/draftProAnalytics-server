// src/infrastructure/espn/EspnScheduleClient.ts

import axios from 'axios';
import { resolveTeamLogo } from '@/utils/resolveTeamLogo';
import { TEAM_COLOR_MAP } from '@/utils/TEAM_COLOR_MAP';

import { NormalizedGameDTO, WeekScheduleDTO } from '@/utils/schedule/scheduleTypes';

import { formatDate, derivePrimetime } from '@/utils/schedule/dateHelpers';
import { normalizeStatus } from '@/utils/schedule/scheduleNormalizer';
import type { GameStatus, ScoringPlayDTO } from '@/utils/schedule/scheduleTypes';

export class EspnScheduleClient {
  async getWeekEvents(year: number, seasonType: number, week: number): Promise<WeekScheduleDTO> {
    const listUrl = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${year}/types/${seasonType}/weeks/${week}/events`;
    const { data } = await axios.get(listUrl);
    const items = data.items ?? [];

    const playoffRoundFromWeek = (w: number): 'WILDCARD' | 'DIVISIONAL' | 'CONFERENCE' | 'SUPERBOWL' | null => {
      if (w === 1) return 'WILDCARD'
      if (w === 2) return 'DIVISIONAL'
      if (w === 3) return 'CONFERENCE'
      if (w === 4) return 'SUPERBOWL'
      return null
    }

    const normalizedEvents = await Promise.all(
      items.map(async (item: any) => {
        try {
          const match = item.$ref?.match(/\/events\/(\d+)/);
          const eventId = match ? Number(match[1]) : null;
          if (!eventId) return null;

          // Fetch event root
          const eventRes = await axios.get(item.$ref);
          const e = eventRes.data;

          const competitions = Array.isArray(e.competitions) ? e.competitions : [];
          const comp = competitions[0];

          if (!comp || !Array.isArray(comp.competitors)) {
            console.warn(`⚠️ Event ${eventId} missing competitor info`);
            return null;
          }

          // Competitors
          const competitors = comp.competitors;

          const homeRaw = competitors.find((c: any) => c.homeAway === 'home');
          const awayRaw = competitors.find((c: any) => c.homeAway === 'away');

          if (!homeRaw || !awayRaw) {
            console.warn(`⚠️ Event ${eventId} missing home/away structure`);
            return null;
          }
          //console.log('competitor sample', competitors[0])
          /*
          console.log("@@@@@@@@@@@@@@@@@@@@")
          console.log("Home Seed: "+homeRaw)
          console.log("Away Seed: "+awayRaw)
          console.log("@@@@@@@@@@@@@@@@@@@@")
          */
          const homeSeed = this.readSeed(homeRaw)
          const awaySeed = this.readSeed(awayRaw)

          // Fetch team objects
          const homeTeamObj = await this.fetchRefObject(homeRaw.team?.$ref);
          const awayTeamObj = await this.fetchRefObject(awayRaw.team?.$ref);
          
          const homeTeamName =
            homeTeamObj?.displayName || homeTeamObj?.shortDisplayName || homeTeamObj?.name || 'TBD';

          const awayTeamName =
            awayTeamObj?.displayName || awayTeamObj?.shortDisplayName || awayTeamObj?.name || 'TBD';

          const homeAbbrev = typeof homeTeamObj?.abbreviation === 'string' ? homeTeamObj.abbreviation : null
          const awayAbbrev = typeof awayTeamObj?.abbreviation === 'string' ? awayTeamObj.abbreviation : null

          const playoffRound = seasonType === 3 ? playoffRoundFromWeek(week) : null

          // ESPN logos
          const homeLogoEspn = homeTeamObj?.logos?.[0]?.href ?? null;
          const awayLogoEspn = awayTeamObj?.logos?.[0]?.href ?? null;

          // Local logos
          const homeLogoLocal = resolveTeamLogo(homeTeamName);
          const awayLogoLocal = resolveTeamLogo(awayTeamName);

          // Scores
          const homeScoreObj = await this.fetchRefObject(homeRaw.score?.$ref);
          const awayScoreObj = await this.fetchRefObject(awayRaw.score?.$ref);

          const homeScore = typeof homeScoreObj?.value === 'number' ? homeScoreObj.value : null;

          const awayScore = typeof awayScoreObj?.value === 'number' ? awayScoreObj.value : null;

          // Winner flags
          const homeWinner = homeRaw?.winner === true;
          const awayWinner = awayRaw?.winner === true;
          // Status
          const rawStatus =
            comp?.status?.type?.shortDetail ||
            comp?.status?.type?.detail ||
            comp?.status?.type?.description ||
            e.status?.type?.name ||
            'Scheduled';

          // ESPN state: 'pre' | 'in' | 'post' | 'postponed' | etc.
          const state: string = comp?.status?.type?.state ?? e?.status?.type?.state ?? 'pre';

          let statusNormalized: GameStatus;

          // ---------------- Start status Normalization ------------------------------
          // 1) Use ESPN state as primary truth
          if (state === 'post' || state === 'completed') {
            statusNormalized = 'Final';
          } else if (state === 'in' || this.gameHasScores(homeScore) || this.gameHasScores(awayScore)) {
            statusNormalized = 'In Progress';
            // 👈 THIS is the key change: mark in-progress as soon as game is live,
            // regardless of whether anyone has scored yet.
            statusNormalized = 'In Progress';
          } else if (state === 'postponed') {
            statusNormalized = 'Postponed';
          } else {
            // 2) Fallback to string-based normalizer for odd cases
            statusNormalized = normalizeStatus(rawStatus);
          }

          // 3) Optional score-based override for edge cases
          //    If ESPN missed 'post' but we clearly have a winner + non-zero score:
          if (
            statusNormalized !== 'Final' &&
            (this.gameHasScores(homeScore) || this.gameHasScores(awayScore)) &&
            (homeWinner || awayWinner)
          ) {
            statusNormalized = 'Final';
          }

          // ALWAYS sync statusDetail to normalized status
          const statDetail = statusNormalized;
          // ---------------- End status Normalization ------------------------------

          //---------------- End status Normalization ------------------------------
          // Date
          const date = comp?.date || e.date || item?.date || null;

          const dateFormatted = formatDate(date);

          // Primetime
          const { isPrimetime, primetimeType } = derivePrimetime(date);
          // -----------------------------------------------
          // Scoring plays (live, from summary endpoint)
          // -----------------------------------------------
          let scoringSummaryShort: string | null = null;
          let scoringPlays: ScoringPlayDTO[] = [];

          try {
            const plays = await this.fetchScoringPlays(eventId);

            scoringPlays = plays;

            const latest = plays.length > 0 ? plays[plays.length - 1] : null;
            scoringSummaryShort = latest ? latest.text : null;
          } catch (err) {
            console.warn(`[EspnScheduleClient] Scoring plays failed for event ${eventId}`, err);
            scoringPlays = [];
            scoringSummaryShort = null;
          }

          const game: NormalizedGameDTO = {
            id: eventId,

            date,
            dateFormatted,

            homeTeamId: Number(homeTeamObj?.id) || null,
            homeTeamName,
            homeLogoLocal,
            homeLogoEspn,
            homeScore,
            homeWinner,
            teamColorHome: TEAM_COLOR_MAP[homeTeamName] ?? '#666',

            awayTeamId: Number(awayTeamObj?.id) || null,
            awayTeamName,
            awayLogoLocal,
            awayLogoEspn,
            awayScore,
            awayWinner,
            teamColorAway: TEAM_COLOR_MAP[awayTeamName] ?? '#666',

            status: statusNormalized,
            statusDetail: statDetail,

            isPrimetime,
            primetimeType,

            scoringSummaryShort,
            scoringPlays,
            homeSeed,
            awaySeed,
          };

          return game;
        } catch (err) {
          console.error('❌ Failed to normalize event:', err);
          return null;
        }
      })
    );

    const readSeed = (c: unknown): number | null => {
      if (!c || typeof c !== 'object') return null
      const obj = c as Record<string, unknown>

      const seed = obj.seed
      if (typeof seed === 'number') return seed

      const rank = obj.rank
      if (typeof rank === 'number') return rank

      const curatedRank = obj.curatedRank
      if (curatedRank && typeof curatedRank === 'object') {
        const cr = curatedRank as Record<string, unknown>
        const cur = cr.current
        if (typeof cur === 'number') return cur
      }

      return null
    }

    return {
      year,
      seasonType,
      week,
      events: normalizedEvents.filter(Boolean) as NormalizedGameDTO[],
    };
  }

  private gameHasScores(teamScore: number): boolean {
    let rc: boolean = false;
    if (teamScore !== null && teamScore > 0) {
      rc = true;
    } else {
      rc = false;
    }
    return rc;
  }
  private async fetchRefObject(ref: string | undefined): Promise<any | null> {
    try {
      if (!ref) return null;
      const { data } = await axios.get(ref);
      return data ?? null;
    } catch {
      return null;
    }
  }
  // ... inside class EspnScheduleClient { ... }
  private async fetchScoringPlays(eventId: number): Promise<ScoringPlayDTO[]> {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${eventId}`;

    try {
      const { data } = await axios.get(url, { timeout: 15000 });

      const rawPlays: any[] = Array.isArray(data?.scoringPlays) ? data.scoringPlays : [];

      return rawPlays
        .map((p: any): ScoringPlayDTO | null => {
          const textRaw =
            typeof p.text === 'string' && p.text.trim().length > 0
              ? p.text
              : typeof p.description === 'string'
                ? p.description
                : '';

          const text = textRaw.trim();
          if (!text) {
            return null;
          }

          const period =
            typeof p.period?.number === 'number'
              ? p.period.number
              : typeof p.period === 'number'
                ? p.period
                : 0;

          const clockDisplay =
            typeof p.clock?.displayValue === 'string'
              ? p.clock.displayValue
              : typeof p.clock === 'string'
                ? p.clock
                : '';

          const homeScore =
            typeof p.homeScore === 'number'
              ? p.homeScore
              : typeof p.homeTeamScore === 'number'
                ? p.homeTeamScore
                : null;

          const awayScore =
            typeof p.awayScore === 'number'
              ? p.awayScore
              : typeof p.awayTeamScore === 'number'
                ? p.awayTeamScore
                : null;

          const type = (p.scoringType?.name ?? p.type ?? null) as string | null;

          return {
            id: Number(p.id ?? 0),
            text,
            period,
            clockDisplay,
            homeScore,
            awayScore,
            type,
          };
        })
        .filter((p): p is ScoringPlayDTO => p !== null);
    } catch (err) {
      console.warn(`[EspnScheduleClient] Failed to fetch scoring plays for event ${eventId}`, err);
      return [];
    }
  }
  private readSeed(competitor: unknown): number | null {
  if (!competitor || typeof competitor !== 'object') return null
  const c = competitor as Record<string, unknown>

  const seed = c.seed
  if (typeof seed === 'number') return seed

  const rank = c.rank
  if (typeof rank === 'number') return rank

  const curatedRank = c.curatedRank
  if (curatedRank && typeof curatedRank === 'object') {
    const cr = curatedRank as Record<string, unknown>
    const cur = cr.current
    if (typeof cur === 'number') return cur
  }

  return null
  }
  
}
