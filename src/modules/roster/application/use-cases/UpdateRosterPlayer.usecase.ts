// src/modules/roster/application/use-cases/UpdateRosterPlayer.usecase.ts

import { IRosterPlayerRepository } from '../../domain/repositories/IRosterPlayerRepository'
import { RosterPlayer } from '../../domain/entities/rosterPlayer.entity'
import { UpdateRosterPlayerDto } from '../dto/rosterPlayer.dto'

export class UpdateRosterPlayerUseCase {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  async execute(id: string, dto: UpdateRosterPlayerDto): Promise<RosterPlayer> {
    // Fetch existing entity
    const existing = await this.rosterPlayerRepository.findById(id)
    if (!existing) {
      throw new Error(`RosterPlayer with id ${id} not found`)
    }

    // Apply updates using domain methods
    if (dto.depthChartOrder !== undefined) {
      existing.updateDepthChartOrder(dto.depthChartOrder)
    }

    if (dto.performanceGrade !== undefined) {
      existing.updatePerformanceGrade(dto.performanceGrade)
    }

    if (dto.isStarter !== undefined && dto.isStarter) {
      existing.setAsStarter()
    }

    if (dto.injuryStatus !== undefined) {
      existing.updateInjuryStatus(dto.injuryStatus)
    }

    if (dto.contractYearsRemaining !== undefined) {
      existing.updateContractYearsRemaining(dto.contractYearsRemaining)
    }

    // Create partial update object for fields not handled by domain methods
    const updateData: Partial<RosterPlayer> = {}
    
    if (dto.playerName !== undefined) {
      Object.assign(updateData, { playerName: dto.playerName })
    }
    if (dto.position !== undefined) {
      Object.assign(updateData, { position: dto.position })
    }
    if (dto.positionGroup !== undefined) {
      Object.assign(updateData, { positionGroup: dto.positionGroup })
    }
    if (dto.age !== undefined) {
      Object.assign(updateData, { age: dto.age })
    }
    if (dto.yearsExperience !== undefined) {
      Object.assign(updateData, { yearsExperience: dto.yearsExperience })
    }
    if (dto.notes !== undefined) {
      Object.assign(updateData, { notes: dto.notes })
    }

    // Merge domain changes
    Object.assign(updateData, existing.toObject())

    // Persist
    return await this.rosterPlayerRepository.update(id, updateData)
  }
}