// src/modules/roster/infrastructure/repositories/PrismaRosterPlayerRepository.ts

import { PrismaClient, rosterPlayers as PrismaRosterPlayer } from '@prisma/client'
import { IRosterPlayerRepository } from '../../domain/repositories/IRosterPlayerRepository'
import { RosterPlayer, RosterPlayerProps } from '../../domain/entities/rosterPlayer.entity'
import { RosterPlayerMapper } from '../mappers/RosterPlayerMapper'
import { Decimal } from '@prisma/client/runtime/library'

export class PrismaRosterPlayerRepository implements IRosterPlayerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<RosterPlayer | null> {
    const rosterPlayer = await this.prisma.rosterPlayers.findUnique({
      where: { id },
    })

    return rosterPlayer ? RosterPlayerMapper.toDomain(rosterPlayer) : null
  }

  async findByTeamId(teamId: number): Promise<RosterPlayer[]> {
    const rosterPlayers = await this.prisma.rosterPlayers.findMany({
      where: { teamId },
      orderBy: [
        { positionGroup: 'asc' },
        { position: 'asc' },
        { depthChartOrder: 'asc' },
      ],
    })

    return rosterPlayers.map(RosterPlayerMapper.toDomain)
  }

  async findByPlayerId(playerId: string): Promise<RosterPlayer[]> {
    const rosterPlayers = await this.prisma.rosterPlayers.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    })

    return rosterPlayers.map(RosterPlayerMapper.toDomain)
  }

  async findStarters(teamId: number): Promise<RosterPlayer[]> {
    const starters = await this.prisma.rosterPlayers.findMany({
      where: {
        teamId,
        isStarter: true,
      },
      orderBy: [
        { positionGroup: 'asc' },
        { position: 'asc' },
      ],
    })

    return starters.map(RosterPlayerMapper.toDomain)
  }

  async findByPositionGroup(teamId: number, positionGroup: string): Promise<RosterPlayer[]> {
    const rosterPlayers = await this.prisma.rosterPlayers.findMany({
      where: {
        teamId,
        positionGroup,
      },
      orderBy: { depthChartOrder: 'asc' },
    })

    return rosterPlayers.map(RosterPlayerMapper.toDomain)
  }

  async findAll(): Promise<RosterPlayer[]> {
    const rosterPlayers = await this.prisma.rosterPlayers.findMany({
      orderBy: [
        { teamId: 'asc' },
        { positionGroup: 'asc' },
        { depthChartOrder: 'asc' },
      ],
    })

    return rosterPlayers.map(RosterPlayerMapper.toDomain)
  }

  async create(rosterPlayer: RosterPlayer): Promise<RosterPlayer> {
    const data = RosterPlayerMapper.toPersistence(rosterPlayer)

    const created = await this.prisma.rosterPlayers.create({
      data: {
        ...data,
        id: undefined, // Let database generate UUID
      },
    })

    return RosterPlayerMapper.toDomain(created)
  }

  async update(id: string, rosterPlayer: Partial<RosterPlayer>): Promise<RosterPlayer> {
    // Get current data first
    const existing = await this.prisma.rosterPlayers.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error(`RosterPlayer with id ${id} not found`)
    }

    // Convert partial domain entity to persistence format
    const updateData: Partial<PrismaRosterPlayer> = {}
    
    if (rosterPlayer.playerName !== undefined) {
      updateData.playerName = rosterPlayer.playerName
    }
    if (rosterPlayer.position !== undefined) {
      updateData.position = rosterPlayer.position
    }
    if (rosterPlayer.positionGroup !== undefined) {
      updateData.positionGroup = rosterPlayer.positionGroup
    }
    if (rosterPlayer.depthChartOrder !== undefined) {
      updateData.depthChartOrder = rosterPlayer.depthChartOrder
    }
    if (rosterPlayer.age !== undefined) {
      updateData.age = rosterPlayer.age
    }
    if (rosterPlayer.yearsExperience !== undefined) {
      updateData.yearsExperience = rosterPlayer.yearsExperience
    }
    if (rosterPlayer.performanceGrade !== undefined) {
      updateData.performanceGrade = new Decimal(rosterPlayer.performanceGrade)
    }
    if (rosterPlayer.isStarter !== undefined) {
      updateData.isStarter = rosterPlayer.isStarter
    }
    if (rosterPlayer.contractYearsRemaining !== undefined) {
      updateData.contractYearsRemaining = rosterPlayer.contractYearsRemaining
    }
    if (rosterPlayer.injuryStatus !== undefined) {
      updateData.injuryStatus = rosterPlayer.injuryStatus
    }
    if (rosterPlayer.notes !== undefined) {
      updateData.notes = rosterPlayer.notes
    }

    const updated = await this.prisma.rosterPlayers.update({
      where: { id },
      data: updateData,
    })

    return RosterPlayerMapper.toDomain(updated)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.rosterPlayers.delete({
      where: { id },
    })
  }

  async exists(teamId: number, playerId: string): Promise<boolean> {
    const count = await this.prisma.rosterPlayers.count({
      where: {
        teamId,
        playerId,
      },
    })

    return count > 0
  }
}