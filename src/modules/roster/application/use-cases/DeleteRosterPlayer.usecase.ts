
// src/modules/roster/application/use-cases/DeleteRosterPlayer.usecase.ts

import { IRosterPlayerRepository } from "../../domain/repositories/IRosterPlayerRepository"

export class DeleteRosterPlayerUseCase {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.rosterPlayerRepository.findById(id)
    if (!existing) {
      throw new Error(`RosterPlayer with id ${id} not found`)
    }

    await this.rosterPlayerRepository.delete(id)
  }
}
