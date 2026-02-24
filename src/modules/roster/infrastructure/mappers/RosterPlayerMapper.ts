// src/modules/roster/infrastructure/mappers/RosterPlayerMapper.ts

import { rosterPlayers as PrismaRosterPlayer } from '@prisma/client'
import { RosterPlayer, RosterPlayerProps } from '../../domain/entities/rosterPlayer.entity'
import { Decimal } from '@prisma/client/runtime/library'

export class RosterPlayerMapper {
  static toDomain(raw: PrismaRosterPlayer): RosterPlayer {
    // Debug logging to help diagnose issues
    if (!raw) {
      throw new Error('RosterPlayerMapper.toDomain: raw data is null or undefined')
    }

    // Validate required fields
    if (!raw.id) {
      throw new Error('RosterPlayerMapper.toDomain: raw.id is missing')
    }

    const props: RosterPlayerProps = {
      id: raw.id,
      teamId: raw.teamId,
      playerId: raw.playerId ?? null,
      playerName: raw.playerName,
      position: raw.position,
      positionGroup: raw.positionGroup,
      depthChartOrder: raw.depthChartOrder ?? 99,
      age: raw.age,
      yearsExperience: raw.yearsExperience,
      performanceGrade: RosterPlayerMapper.safeConvertDecimal(raw.performanceGrade, 'performanceGrade'),
      isStarter: raw.isStarter ?? false,
      contractYearsRemaining: raw.contractYearsRemaining ?? 0,
      injuryStatus: raw.injuryStatus ?? null,
      notes: raw.notes ?? null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }

    return RosterPlayer.reconstitute(props)
  }

  static toPersistence(rosterPlayer: RosterPlayer): Omit<PrismaRosterPlayer, 'createdAt' | 'updatedAt'> {
    return {
      id: rosterPlayer.id,
      teamId: rosterPlayer.teamId,
      playerId: rosterPlayer.playerId,
      playerName: rosterPlayer.playerName,
      position: rosterPlayer.position,
      positionGroup: rosterPlayer.positionGroup,
      depthChartOrder: rosterPlayer.depthChartOrder,
      age: rosterPlayer.age,
      yearsExperience: rosterPlayer.yearsExperience,
      performanceGrade: new Decimal(rosterPlayer.performanceGrade),
      isStarter: rosterPlayer.isStarter,
      contractYearsRemaining: rosterPlayer.contractYearsRemaining,
      injuryStatus: rosterPlayer.injuryStatus,
      notes: rosterPlayer.notes,
    }
  }

  /**
   * Safely convert Prisma Decimal to number with detailed error handling
   */
  private static safeConvertDecimal(
    value: any,
    fieldName: string,
    defaultValue: number = 50.0
  ): number {
    // Handle null/undefined - use default
    if (value === null || value === undefined) {
      console.warn(
        `RosterPlayerMapper: ${fieldName} is null/undefined, using default: ${defaultValue}`
      )
      return defaultValue
    }

    // If it's already a number, validate and return it
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        console.warn(
          `RosterPlayerMapper: ${fieldName} is invalid number (${value}), using default: ${defaultValue}`
        )
        return defaultValue
      }
      return value
    }

    // If it's a Decimal object or other object
    if (typeof value === 'object') {
      try {
        // Prisma Decimal objects have toNumber() or toString() methods
        if (typeof value.toNumber === 'function') {
          const num = value.toNumber()
          if (isNaN(num) || !isFinite(num)) {
            console.warn(
              `RosterPlayerMapper: ${fieldName}.toNumber() returned invalid (${num}), using default: ${defaultValue}`
            )
            return defaultValue
          }
          return num
        }

        if (typeof value.toString === 'function') {
          const str = value.toString()
          const num = parseFloat(str)
          if (isNaN(num) || !isFinite(num)) {
            console.warn(
              `RosterPlayerMapper: ${fieldName}.toString() parse failed (${str}), using default: ${defaultValue}`
            )
            return defaultValue
          }
          return num
        }

        // Last resort: try valueOf
        if (typeof value.valueOf === 'function') {
          const val = value.valueOf()
          if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
            return val
          }
        }

        console.warn(
          `RosterPlayerMapper: ${fieldName} object has no conversion method, using default: ${defaultValue}. Value:`,
          value
        )
        return defaultValue
      } catch (error) {
        console.error(
          `RosterPlayerMapper: Error converting ${fieldName}:`,
          error,
          'Value:',
          value
        )
        return defaultValue
      }
    }

    // Try to convert string or other types
    try {
      const num = parseFloat(String(value))
      if (isNaN(num) || !isFinite(num)) {
        console.warn(
          `RosterPlayerMapper: ${fieldName} parse failed (${value}), using default: ${defaultValue}`
        )
        return defaultValue
      }
      return num
    } catch (error) {
      console.error(
        `RosterPlayerMapper: Failed to parse ${fieldName}:`,
        error,
        'Value:',
        value
      )
      return defaultValue
    }
  }
}