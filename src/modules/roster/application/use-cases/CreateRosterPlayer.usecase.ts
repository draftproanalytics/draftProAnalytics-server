// src/modules/roster/application/use-cases/CreateRosterPlayer.usecase.ts

import { IRosterPlayerRepository } from '../../domain/repositories/IRosterPlayerRepository'
import { RosterPlayer, RosterPlayerProps } from '../../domain/entities/rosterPlayer.entity'
import { CreateRosterPlayerDto } from '../dto/rosterPlayer.dto'
import { randomUUID } from 'crypto'

export class CreateRosterPlayerUseCase {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  async execute(dto: CreateRosterPlayerDto): Promise<RosterPlayer> {
    // Check if player already exists for this team
    if (dto.playerId) {
      const exists = await this.rosterPlayerRepository.exists(dto.teamId, dto.playerId)
      if (exists) {
        throw new Error(`Player ${dto.playerId} already exists on team ${dto.teamId}`)
      }
    }

    // Create entity
    const props: RosterPlayerProps = {
      id: randomUUID(),
      teamId: dto.teamId,
      playerId: dto.playerId ?? null,
      playerName: dto.playerName,
      position: dto.position,
      positionGroup: dto.positionGroup,
      depthChartOrder: dto.depthChartOrder ?? 99,
      age: dto.age,
      yearsExperience: dto.yearsExperience,
      performanceGrade: dto.performanceGrade ?? 50.0,
      isStarter: dto.isStarter ?? false,
      contractYearsRemaining: dto.contractYearsRemaining ?? 0,
      injuryStatus: dto.injuryStatus ?? null,
      notes: dto.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const rosterPlayer = RosterPlayer.create(props)

    // Persist
    return await this.rosterPlayerRepository.create(rosterPlayer)
  }
}