// src/modules/roster/application/use-cases/GetRosterPlayer.usecase.ts

import { IRosterPlayerRepository } from '../../domain/repositories/IRosterPlayerRepository'
import { RosterPlayer } from '../../domain/entities/rosterPlayer.entity'

export class GetRosterPlayerUseCase {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  async execute(id: string): Promise<RosterPlayer | null> {
    return await this.rosterPlayerRepository.findById(id)
  }
}
