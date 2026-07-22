import type { GameFact, TeamFact } from '@/modules/draftOrder/domain/repositories/GameFactsRepository'
import type {
  CreateDraftOrderEntryRequest,
  CreateDraftOrderSnapshotRequest,
  CreateDraftOrderTiebreakAuditRequest,
} from '@/modules/draftOrder/domain/repositories/DraftOrderSnapshotRepository'
import { sha256Hex } from '@/modules/draftOrder/application/utils/sha256'

type DraftOrderMode = 'current' | 'projection'

interface TeamAgg {
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  opponents: number[]
  defeatedOpponents: number[]
}

interface Row extends TeamAgg, TeamFact {
  winPct: number
  sos: number
  sov: number
  combinedPointsRank: number
}

interface PairMetric {
  games: number
  wins: number
  losses: number
  ties: number
}

function winPct(wins: number, losses: number, ties: number): number {
  const games = wins + losses + ties
  return games === 0 ? 0 : (wins + ties * 0.5) / games
}

function toDec5(value: number): string {
  return value.toFixed(5)
}

function compareNumber(a: number, b: number): number {
  const delta = a - b
  return Math.abs(delta) < 0.0000001 ? 0 : delta
}

function pairKey(teamA: number, teamB: number): string {
  return `${teamA}:${teamB}`
}

function getPairMetric(metrics: ReadonlyMap<string, PairMetric>, teamId: number, opponentId: number): PairMetric {
  return metrics.get(pairKey(teamId, opponentId)) ?? { games: 0, wins: 0, losses: 0, ties: 0 }
}

function recordMetric(metric: PairMetric, result: 'win' | 'loss' | 'tie'): void {
  metric.games += 1
  if (result === 'win') metric.wins += 1
  else if (result === 'loss') metric.losses += 1
  else metric.ties += 1
}

function opponentAggregate(opponentIds: readonly number[], byTeamId: ReadonlyMap<number, TeamAgg>): number {
  let wins = 0
  let losses = 0
  let ties = 0
  for (const opponentId of opponentIds) {
    const opponent = byTeamId.get(opponentId)
    if (!opponent) continue
    wins += opponent.wins
    losses += opponent.losses
    ties += opponent.ties
  }
  return winPct(wins, losses, ties)
}

function commonOpponents(a: Row, b: Row): readonly number[] {
  const aSet = new Set(a.opponents)
  return [...new Set(b.opponents.filter((opponentId) => aSet.has(opponentId) && opponentId !== a.teamId && opponentId !== b.teamId))]
}

function percentageAgainst(
  teamId: number,
  opponentIds: readonly number[],
  pairMetrics: ReadonlyMap<string, PairMetric>
): { percentage: number; games: number } {
  let wins = 0
  let losses = 0
  let ties = 0
  let games = 0
  for (const opponentId of opponentIds) {
    const metric = getPairMetric(pairMetrics, teamId, opponentId)
    games += metric.games
    wins += metric.wins
    losses += metric.losses
    ties += metric.ties
  }
  return { percentage: winPct(wins, losses, ties), games }
}

function netPoints(row: Row): number {
  return row.pointsFor - row.pointsAgainst
}

function compareTieBreakers(a: Row, b: Row, pairMetrics: ReadonlyMap<string, PairMetric>): number {
  let result = compareNumber(a.sos, b.sos)
  if (result !== 0) return result

  const headToHeadA = getPairMetric(pairMetrics, a.teamId, b.teamId)
  const headToHeadB = getPairMetric(pairMetrics, b.teamId, a.teamId)
  if (headToHeadA.games > 0 && headToHeadA.games === headToHeadB.games) {
    result = compareNumber(
      winPct(headToHeadA.wins, headToHeadA.losses, headToHeadA.ties),
      winPct(headToHeadB.wins, headToHeadB.losses, headToHeadB.ties)
    )
    if (result !== 0) return result
  }

  const common = commonOpponents(a, b)
  const commonA = percentageAgainst(a.teamId, common, pairMetrics)
  const commonB = percentageAgainst(b.teamId, common, pairMetrics)
  if (commonA.games >= 4 && commonB.games >= 4) {
    result = compareNumber(commonA.percentage, commonB.percentage)
    if (result !== 0) return result
  }

  result = compareNumber(a.sov, b.sov)
  if (result !== 0) return result

  // A lower combined league rank is better. Better teams receive the later pick,
  // so reverse this metric while sorting from pick 1 to pick 32.
  result = compareNumber(b.combinedPointsRank, a.combinedPointsRank)
  if (result !== 0) return result

  result = compareNumber(netPoints(a), netPoints(b))
  if (result !== 0) return result

  // A database-stable fallback is required for a weekly calculation. The NFL's
  // final unresolved tiebreak is a coin toss; DPA records this as deterministic fallback.
  return a.teamId - b.teamId
}

function buildAudit(row: Row, tiedOnRecord: boolean): readonly CreateDraftOrderTiebreakAuditRequest[] {
  const audits: CreateDraftOrderTiebreakAuditRequest[] = [
    {
      stepNbr: 1,
      ruleCode: 'WIN_PCT',
      resultCode: 'APPLIED',
      resultSummary: `winPct=${toDec5(row.winPct)}`,
      detailsJson: { wins: row.wins, losses: row.losses, ties: row.ties },
    },
  ]

  if (tiedOnRecord) {
    audits.push(
      {
        stepNbr: 2,
        ruleCode: 'SOS',
        resultCode: 'APPLIED',
        resultSummary: `sos=${toDec5(row.sos)}`,
        detailsJson: null,
      },
      {
        stepNbr: 3,
        ruleCode: 'NFL_TIEBREAK_CHAIN',
        resultCode: 'AVAILABLE_AS_NEEDED',
        resultSummary: 'head-to-head, common games, strength of victory, combined points rank, net points',
        detailsJson: {
          strengthOfVictory: toDec5(row.sov),
          combinedPointsRank: row.combinedPointsRank,
          netPoints: netPoints(row),
        },
      }
    )
  }

  return audits
}

export class ComputeCurrentDraftOrderService {
  public compute(args: {
    seasonYear: string
    seasonType: number
    throughWeek: number | null
    teams: ReadonlyArray<TeamFact>
    games: ReadonlyArray<GameFact>
    mode?: DraftOrderMode
    strategy?: string | null
  }): { snapshot: CreateDraftOrderSnapshotRequest } {
    const mode = args.mode ?? 'current'
    const strategy = mode === 'projection' ? args.strategy?.trim() || 'baseline' : null
    const aggregates = new Map<number, TeamAgg>()
    const pairMetrics = new Map<string, PairMetric>()

    const ensure = (teamId: number): TeamAgg => {
      const existing = aggregates.get(teamId)
      if (existing) return existing
      const created: TeamAgg = {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        opponents: [],
        defeatedOpponents: [],
      }
      aggregates.set(teamId, created)
      return created
    }

    for (const team of args.teams) ensure(team.teamId)

    for (const game of args.games) {
      if (game.homeScore === null || game.awayScore === null) continue
      const home = ensure(game.homeTeamId)
      const away = ensure(game.awayTeamId)
      home.opponents.push(game.awayTeamId)
      away.opponents.push(game.homeTeamId)
      home.pointsFor += game.homeScore
      home.pointsAgainst += game.awayScore
      away.pointsFor += game.awayScore
      away.pointsAgainst += game.homeScore

      const homeMetric = pairMetrics.get(pairKey(game.homeTeamId, game.awayTeamId)) ?? { games: 0, wins: 0, losses: 0, ties: 0 }
      const awayMetric = pairMetrics.get(pairKey(game.awayTeamId, game.homeTeamId)) ?? { games: 0, wins: 0, losses: 0, ties: 0 }
      pairMetrics.set(pairKey(game.homeTeamId, game.awayTeamId), homeMetric)
      pairMetrics.set(pairKey(game.awayTeamId, game.homeTeamId), awayMetric)

      if (game.homeScore > game.awayScore) {
        home.wins += 1
        away.losses += 1
        home.defeatedOpponents.push(game.awayTeamId)
        recordMetric(homeMetric, 'win')
        recordMetric(awayMetric, 'loss')
      } else if (game.awayScore > game.homeScore) {
        away.wins += 1
        home.losses += 1
        away.defeatedOpponents.push(game.homeTeamId)
        recordMetric(homeMetric, 'loss')
        recordMetric(awayMetric, 'win')
      } else {
        home.ties += 1
        away.ties += 1
        recordMetric(homeMetric, 'tie')
        recordMetric(awayMetric, 'tie')
      }
    }

    const baseRows = args.teams.map((team) => {
      const aggregate = ensure(team.teamId)
      return {
        ...team,
        ...aggregate,
        winPct: winPct(aggregate.wins, aggregate.losses, aggregate.ties),
        sos: opponentAggregate(aggregate.opponents, aggregates),
        sov: opponentAggregate(aggregate.defeatedOpponents, aggregates),
        combinedPointsRank: 0,
      }
    })

    const pointsForRanks = [...baseRows].sort((a, b) => b.pointsFor - a.pointsFor || a.teamId - b.teamId)
    const pointsAgainstRanks = [...baseRows].sort((a, b) => a.pointsAgainst - b.pointsAgainst || a.teamId - b.teamId)
    const forRank = new Map(pointsForRanks.map((row, index) => [row.teamId, index + 1]))
    const againstRank = new Map(pointsAgainstRanks.map((row, index) => [row.teamId, index + 1]))

    const rows: Row[] = baseRows.map((row) => ({
      ...row,
      combinedPointsRank: (forRank.get(row.teamId) ?? args.teams.length) + (againstRank.get(row.teamId) ?? args.teams.length),
    }))

    rows.sort((a, b) => compareNumber(a.winPct, b.winPct) || compareTieBreakers(a, b, pairMetrics))

    const recordCounts = new Map<string, number>()
    for (const row of rows) {
      const key = `${row.wins}-${row.losses}-${row.ties}`
      recordCounts.set(key, (recordCounts.get(key) ?? 0) + 1)
    }

    const entries: CreateDraftOrderEntryRequest[] = rows.map((row, index) => ({
      teamId: row.teamId,
      draftSlot: index + 1,
      isPlayoff: false,
      isProjected: mode === 'projection',
      wins: row.wins,
      losses: row.losses,
      ties: row.ties,
      winPct: toDec5(row.winPct),
      sos: toDec5(row.sos),
      pointsFor: row.pointsFor,
      pointsAgainst: row.pointsAgainst,
      audits: buildAudit(row, (recordCounts.get(`${row.wins}-${row.losses}-${row.ties}`) ?? 0) > 1),
    }))

    const inputHash = sha256Hex(
      JSON.stringify({
        mode,
        strategy,
        seasonYear: args.seasonYear,
        seasonType: args.seasonType,
        throughWeek: args.throughWeek,
        teamIds: args.teams.map((team) => team.teamId).sort((a, b) => a - b),
        games: args.games
          .map((game) => ({
            id: game.gameId,
            week: game.week,
            homeTeamId: game.homeTeamId,
            awayTeamId: game.awayTeamId,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
          }))
          .sort((a, b) => a.id - b.id),
      })
    )

    const snapshot: CreateDraftOrderSnapshotRequest = {
      mode,
      strategy,
      seasonYear: args.seasonYear,
      seasonType: args.seasonType,
      throughWeek: args.throughWeek,
      source: 'internal-nfl-rules',
      inputHash,
      computedAt: new Date(),
      entries,
    }

    return { snapshot }
  }
}
