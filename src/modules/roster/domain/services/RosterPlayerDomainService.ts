// src/modules/roster/domain/services/RosterPlayerDomainService.ts

import { RosterPlayer } from '../entities/rosterPlayer.entity'
import { IRosterPlayerRepository } from '../repositories/IRosterPlayerRepository'

/**
 * Domain Service for complex roster player business logic
 * Use this for operations that don't naturally belong to a single entity
 */
export class RosterPlayerDomainService {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  /**
   * Validate and adjust depth chart when a player is promoted to starter
   * Ensures only one starter per position per team
   */
  async promoteToStarter(
    playerId: string,
    teamId: number,
    position: string
  ): Promise<void> {
    // Get current starter at this position
    const teamRoster = await this.rosterPlayerRepository.findByTeamId(teamId)
    const currentStarter = teamRoster.find(
      player => player.position === position && player.isStarter && player.id !== playerId
    )

    // If there's a current starter, demote them
    if (currentStarter) {
      await this.rosterPlayerRepository.update(currentStarter.id, {
        ...currentStarter,
        isStarter: false,
        depthChartOrder: 2,
      })
    }

    // Promote the new player
    const playerToPromote = await this.rosterPlayerRepository.findById(playerId)
    if (!playerToPromote) {
      throw new Error(`Player ${playerId} not found`)
    }

    playerToPromote.setAsStarter()
    await this.rosterPlayerRepository.update(playerId, playerToPromote)
  }

  /**
   * Reorder depth chart after a player is removed
   * Adjusts all players below the removed player's position
   */
  async reorderDepthChartAfterRemoval(
    teamId: number,
    position: string,
    removedDepthOrder: number
  ): Promise<void> {
    const positionGroup = this.getPositionGroup(position)
    const players = await this.rosterPlayerRepository.findByPositionGroup(teamId, positionGroup)

    // Get players at same position with higher depth order
    const playersToReorder = players.filter(
      player => player.position === position && player.depthChartOrder > removedDepthOrder
    )

    // Move each player up one spot
    for (const player of playersToReorder) {
      await this.rosterPlayerRepository.update(player.id, {
        ...player,
        depthChartOrder: player.depthChartOrder - 1,
      })
    }
  }

  /**
   * Calculate team depth score by position group
   * Returns a score indicating roster strength
   */
  async calculateDepthScore(teamId: number, positionGroup: string): Promise<number> {
    const players = await this.rosterPlayerRepository.findByPositionGroup(teamId, positionGroup)

    if (players.length === 0) return 0

    // Weight starters more heavily
    let totalScore = 0
    for (const player of players) {
      const weight = player.isStarter ? 1.5 : 1.0
      totalScore += player.performanceGrade * weight
    }

    return totalScore / players.length
  }

  /**
   * Identify roster weaknesses (positions with low depth or performance)
   */
  async identifyWeakPositions(teamId: number): Promise<{
    position: string
    averageGrade: number
    playerCount: number
    hasStarter: boolean
  }[]> {
    const roster = await this.rosterPlayerRepository.findByTeamId(teamId)
    
    // Group by position
    const positionMap = new Map<string, RosterPlayer[]>()
    for (const player of roster) {
      const existing = positionMap.get(player.position) || []
      existing.push(player)
      positionMap.set(player.position, existing)
    }

    // Analyze each position
    const weakPositions: {
      position: string
      averageGrade: number
      playerCount: number
      hasStarter: boolean
    }[] = []

    for (const [position, players] of positionMap.entries()) {
      const averageGrade =
        players.reduce((sum, p) => sum + p.performanceGrade, 0) / players.length
      const hasStarter = players.some(p => p.isStarter)

      // Consider a position weak if: low grade OR no starter OR only 1 player
      if (averageGrade < 60 || !hasStarter || players.length < 2) {
        weakPositions.push({
          position,
          averageGrade,
          playerCount: players.length,
          hasStarter,
        })
      }
    }

    return weakPositions.sort((a, b) => a.averageGrade - b.averageGrade)
  }

  /**
   * Validate roster composition (minimum players per position group)
   */
  async validateRosterComposition(teamId: number): Promise<{
    valid: boolean
    issues: string[]
  }> {
    const roster = await this.rosterPlayerRepository.findByTeamId(teamId)
    const issues: string[] = []

    // Count by position group
    const offenseCount = roster.filter(p => p.positionGroup === 'OFF').length
    const defenseCount = roster.filter(p => p.positionGroup === 'DEF').length
    const specialTeamsCount = roster.filter(p => p.positionGroup === 'ST').length

    // NFL minimum guidelines
    if (offenseCount < 11) {
      issues.push(`Offense has ${offenseCount} players (minimum 11 recommended)`)
    }
    if (defenseCount < 11) {
      issues.push(`Defense has ${defenseCount} players (minimum 11 recommended)`)
    }
    if (specialTeamsCount < 3) {
      issues.push(`Special Teams has ${specialTeamsCount} players (minimum 3 recommended)`)
    }

    // Check for QB
    const hasQB = roster.some(p => p.position === 'QB')
    if (!hasQB) {
      issues.push('No quarterback on roster')
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  }

  /**
   * Get position group from position
   */
  private getPositionGroup(position: string): string {
    const offense = ['QB', 'RB', 'FB', 'WR', 'TE', 'OL', 'C', 'G', 'T']
    const defense = ['DE', 'DT', 'NT', 'LB', 'MLB', 'OLB', 'CB', 'S', 'FS', 'SS']
    const specialTeams = ['K', 'P', 'LS']

    if (offense.includes(position)) return 'OFF'
    if (defense.includes(position)) return 'DEF'
    if (specialTeams.includes(position)) return 'ST'

    throw new Error(`Unknown position: ${position}`)
  }
}