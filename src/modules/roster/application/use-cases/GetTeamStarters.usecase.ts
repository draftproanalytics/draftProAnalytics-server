
// src/modules/roster/application/use-cases/GetTeamStarters.usecase.ts

import { IRosterPlayerRepository } from "../../domain/repositories/IRosterPlayerRepository";
import { RosterPlayer } from "../../domain/entities/rosterPlayer.entity";

export class GetTeamStartersUseCase {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  async execute(teamId: number): Promise<RosterPlayer[]> {
    return await this.rosterPlayerRepository.findStarters(teamId)
  }
}
