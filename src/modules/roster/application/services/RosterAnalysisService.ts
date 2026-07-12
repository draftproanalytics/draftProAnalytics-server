// src/modules/roster/application/services/RosterAnalysisService.ts

import { IRosterPlayerRepository } from '../../domain/repositories/IRosterPlayerRepository'
import { RosterPlayerDomainService } from '../../domain/services/RosterPlayerDomainService'

/**
 * Application Service for roster analysis and reporting
 * Coordinates between domain services and use cases
 */
export class RosterAnalysisService {
  constructor(
    private readonly rosterPlayerRepository: IRosterPlayerRepository,
    private readonly domainService: RosterPlayerDomainService
  ) {}

  /**
   * Generate comprehensive team roster report
   */
  async generateTeamReport(teamId: number): Promise<TeamRosterReport> {
    const roster = await this.rosterPlayerRepository.findByTeamId(teamId)
    const starters = await this.rosterPlayerRepository.findStarters(teamId)

    // Calculate depth scores
    const offenseScore = await this.domainService.calculateDepthScore(teamId, 'OFF')
    const defenseScore = await this.domainService.calculateDepthScore(teamId, 'DEF')
    const specialTeamsScore = await this.domainService.calculateDepthScore(teamId, 'ST')

    // Identify weak positions
    const weakPositions = await this.domainService.identifyWeakPositions(teamId)

    // Validate roster composition
    const validation = await this.domainService.validateRosterComposition(teamId)

    // Calculate averages
    const averageAge = roster.reduce((sum, p) => sum + p.age, 0) / roster.length
    const averageExperience =
      roster.reduce((sum, p) => sum + p.yearsExperience, 0) / roster.length
    const averageGrade =
      roster.reduce((sum, p) => sum + p.performanceGrade, 0) / roster.length

    // Count by position group
    const offenseCount = roster.filter(p => p.positionGroup === 'OFF').length
    const defenseCount = roster.filter(p => p.positionGroup === 'DEF').length
    const specialTeamsCount = roster.filter(p => p.positionGroup === 'ST').length

    // Injury analysis
    const injuredCount = roster.filter(p => p.injuryStatus && p.injuryStatus !== 'HEALTHY').length
    const healthyStarterCount = starters.filter(
      p => !p.injuryStatus || p.injuryStatus === 'HEALTHY'
    ).length

    return {
      teamId,
      totalPlayers: roster.length,
      totalStarters: starters.length,
      positionGroupBreakdown: {
        offense: offenseCount,
        defense: defenseCount,
        specialTeams: specialTeamsCount,
      },
      depthScores: {
        offense: offenseScore,
        defense: defenseScore,
        specialTeams: specialTeamsScore,
        overall: (offenseScore + defenseScore + specialTeamsScore) / 3,
      },
      averages: {
        age: Math.round(averageAge * 10) / 10,
        experience: Math.round(averageExperience * 10) / 10,
        performanceGrade: Math.round(averageGrade * 100) / 100,
      },
      healthStatus: {
        totalInjured: injuredCount,
        healthyStarters: healthyStarterCount,
        injuredStarters: starters.length - healthyStarterCount,
      },
      weakPositions,
      rosterValidation: validation,
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * Compare two teams' rosters
   */
  async compareTeams(teamId1: number, teamId2: number): Promise<TeamComparison> {
    const [report1, report2] = await Promise.all([
      this.generateTeamReport(teamId1),
      this.generateTeamReport(teamId2),
    ])

    return {
      team1: report1,
      team2: report2,
      comparison: {
        totalPlayersAdvantage: report1.totalPlayers - report2.totalPlayers,
        offenseDepthAdvantage: report1.depthScores.offense - report2.depthScores.offense,
        defenseDepthAdvantage: report1.depthScores.defense - report2.depthScores.defense,
        overallDepthAdvantage: report1.depthScores.overall - report2.depthScores.overall,
        experienceAdvantage: report1.averages.experience - report2.averages.experience,
        performanceAdvantage: report1.averages.performanceGrade - report2.averages.performanceGrade,
        healthAdvantage: report1.healthStatus.healthyStarters - report2.healthStatus.healthyStarters,
      },
    }
  }

  /**
   * Get position group depth chart
   */
  async getPositionGroupDepthChart(
    teamId: number,
    positionGroup: 'OFF' | 'DEF' | 'ST'
  ): Promise<DepthChartEntry[]> {
    const players = await this.rosterPlayerRepository.findByPositionGroup(teamId, positionGroup)

    // Group by position
    const positionMap = new Map<string, typeof players>()
    for (const player of players) {
      const existing = positionMap.get(player.position) || []
      existing.push(player)
      positionMap.set(player.position, existing)
    }

    // Build depth chart entries
    const depthChart: DepthChartEntry[] = []

    for (const [position, positionPlayers] of positionMap.entries()) {
      // Sort by depth chart order
      const sorted = positionPlayers.sort((a, b) => a.depthChartOrder - b.depthChartOrder)

      depthChart.push({
        position,
        players: sorted.map(p => ({
          id: p.id,
          name: p.playerName,
          depthChartOrder: p.depthChartOrder,
          isStarter: p.isStarter,
          performanceGrade: p.performanceGrade,
          injuryStatus: p.injuryStatus,
          jerseyNumber: null, // Would come from player details
        })),
      })
    }

    return depthChart.sort((a, b) => a.position.localeCompare(b.position))
  }

  /**
   * Calculate roster turnover needs (contract expiring, aging players)
   */
  async calculateTurnoverNeeds(teamId: number): Promise<TurnoverAnalysis> {
    const roster = await this.rosterPlayerRepository.findByTeamId(teamId)

    const expiringContracts = roster.filter(p => p.contractYearsRemaining <= 1)
    const agingPlayers = roster.filter(p => p.age >= 30)
    const underperformers = roster.filter(p => p.performanceGrade < 50)

    const needsReplacement = [...new Set([...expiringContracts, ...underperformers])]

    // Prioritize by position importance and performance
    const prioritized = needsReplacement
      .map(player => ({
        player,
        priority: this.calculateReplacementPriority(player),
      }))
      .sort((a, b) => b.priority - a.priority)

    return {
      expiringContractsCount: expiringContracts.length,
      agingPlayersCount: agingPlayers.length,
      underperformersCount: underperformers.length,
      totalNeedingReplacement: needsReplacement.length,
      prioritizedReplacements: prioritized.map(p => ({
        playerId: p.player.id,
        playerName: p.player.playerName,
        position: p.player.position,
        reason: this.getReplacementReason(p.player),
        priority: p.priority,
      })),
    }
  }

  /**
   * Calculate replacement priority (higher = more urgent)
   */
  private calculateReplacementPriority(player: any): number {
    let priority = 0

    // Starters are higher priority
    if (player.isStarter) priority += 50

    // Important positions
    if (['QB', 'LT', 'CB', 'EDGE'].includes(player.position)) priority += 30

    // Contract expiring soon
    if (player.contractYearsRemaining === 0) priority += 40
    if (player.contractYearsRemaining === 1) priority += 20

    // Poor performance
    if (player.performanceGrade < 40) priority += 30
    if (player.performanceGrade < 50) priority += 15

    // Aging
    if (player.age >= 33) priority += 20
    if (player.age >= 30) priority += 10

    return priority
  }

  /**
   * Get reason for replacement need
   */
  private getReplacementReason(player: any): string {
    const reasons: string[] = []

    if (player.contractYearsRemaining <= 1) reasons.push('Contract expiring')
    if (player.age >= 30) reasons.push('Aging')
    if (player.performanceGrade < 50) reasons.push('Underperforming')

    return reasons.join(', ')
  }
}

// Types
export interface TeamRosterReport {
  teamId: number
  totalPlayers: number
  totalStarters: number
  positionGroupBreakdown: {
    offense: number
    defense: number
    specialTeams: number
  }
  depthScores: {
    offense: number
    defense: number
    specialTeams: number
    overall: number
  }
  averages: {
    age: number
    experience: number
    performanceGrade: number
  }
  healthStatus: {
    totalInjured: number
    healthyStarters: number
    injuredStarters: number
  }
  weakPositions: Array<{
    position: string
    averageGrade: number
    playerCount: number
    hasStarter: boolean
  }>
  rosterValidation: {
    valid: boolean
    issues: string[]
  }
  generatedAt: string
}

export interface TeamComparison {
  team1: TeamRosterReport
  team2: TeamRosterReport
  comparison: {
    totalPlayersAdvantage: number
    offenseDepthAdvantage: number
    defenseDepthAdvantage: number
    overallDepthAdvantage: number
    experienceAdvantage: number
    performanceAdvantage: number
    healthAdvantage: number
  }
}

export interface DepthChartEntry {
  position: string
  players: Array<{
    id: string
    name: string
    depthChartOrder: number
    isStarter: boolean
    performanceGrade: number
    injuryStatus: string | null
    jerseyNumber: number | null
  }>
}

export interface TurnoverAnalysis {
  expiringContractsCount: number
  agingPlayersCount: number
  underperformersCount: number
  totalNeedingReplacement: number
  prioritizedReplacements: Array<{
    playerId: string
    playerName: string
    position: string
    reason: string
    priority: number
  }>
}