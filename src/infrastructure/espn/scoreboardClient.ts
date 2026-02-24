// src/infrastructure/espn/scoreboardClient.ts
import axios from 'axios'
import { retry, RetryAbortError } from "@/utils/retry";

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
export type SeasonType = 1 | 2 | 3 // 1=pre, 2=reg, 3=post

export interface ScoreboardParams {
  date?: string        // YYYYMMDD, e.g. "20250810"
  year?: number        // e.g. 2025 (preferred)
  seasonType?: SeasonType
  week?: number
  /** legacy; will be translated to `year` if provided */
  season?: number
}

function weekToSunday(year: number, week: number, seasonType: SeasonType) {
  const base =
    seasonType === 2 ? new Date(Date.UTC(year, 8, 1)) :           // Sep 1
    seasonType === 1 ? new Date(Date.UTC(year, 7, 1)) :           // Aug 1
                       new Date(Date.UTC(year + 1, 0, 1))         // Jan 1 next year (post)
  const day = base.getUTCDay()
  const delta = (7 - day) % 7
  const firstSunday = new Date(base); firstSunday.setUTCDate(base.getUTCDate() + delta)
  const target = new Date(firstSunday); target.setUTCDate(firstSunday.getUTCDate() + (week - 1) * 7)
  const y = target.getUTCFullYear(), m = String(target.getUTCMonth() + 1).padStart(2, '0'), d = String(target.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

async function httpGet(params: Record<string, string | number | undefined>) {
  const res = await axios.get(BASE, {
    params,
    timeout: 15000,
    headers: {
      'User-Agent': 'MyNFL/1.0 (+https://draftproanalytics.com)',
      Accept: 'application/json, text/plain, */*',
    },
    validateStatus: () => true,
  })
  if (res.status >= 200 && res.status < 300) return res.data
  const detail = (res.data && (res.data.detail || res.data.message)) || `HTTP ${res.status}`
  if (res.status >= 500) throw new Error(`ESPN 5xx: ${detail}`)
  throw new RetryAbortError(`ESPN non-2xx: ${detail}`)
}

/** Canonical entry point */
/** Canonical entry point */
export async function fetchScoreboard(params: ScoreboardParams) {
  // translate legacy param
  if (params.season != null && params.year == null) {
    console.warn('[scoreboardClient] Received legacy param season=. Translating to year.')
    params.year = params.season
    delete (params as any).season
  }

  // build canonical query
  const q: Record<string, string | number | undefined> = {}
  if (params.date) q.dates = params.date
  if (params.year != null) q.seasonYear = params.year        // <-- fix key
  if (params.seasonType != null) q.seasontype = params.seasonType
  if (params.week != null) q.week = params.week

  let raw: any
  try {
    raw = await retry(() => httpGet(q), { retries: 2, factor: 2, minTimeout: 500 })
  } catch (e) {
    // fallback to computed date if week-based fetch fails
    if (!params.date && params.year != null && params.seasonType != null && params.week != null) {
      const fallbackDate = weekToSunday(params.year, params.week, params.seasonType)
      raw = await retry(() => httpGet({ dates: fallbackDate }), { retries: 2, factor: 2, minTimeout: 500 })
    } else {
      throw e
    }
  }

  // 🔍 Normalize ESPN’s structure into usable format
  const events = (raw?.events ?? []).map((ev: any) => {
    const comp = ev.competitions?.[0]
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home')
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away')

    return {
      id: ev.id,
      date: ev.date,
      status: comp?.status?.type?.name ?? 'scheduled',
      homeTeamId: home ? Number(home.team.id) : undefined,
      awayTeamId: away ? Number(away.team.id) : undefined,
      homeScore: home?.score ? Number(home.score) : null,
      awayScore: away?.score ? Number(away.score) : null,
      homeTeamName: home?.team?.displayName ?? null,
      awayTeamName: away?.team?.displayName ?? null,
    }
  })

  console.log(
    `(src/infrastructure/espn/scoreboardClient.ts) Parsed ${events.length} events from ESPN for`,
    params.date ?? `${params.year}-W${params.week}`
  )

  return { events }
}

