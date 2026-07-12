
// src/modules/roster/application/use-cases/GetTeamRoster.usecase.ts

import { RosterPlayer } from "../../domain/entities/rosterPlayer.entity";
import { IRosterPlayerRepository } from "../../domain/repositories/IRosterPlayerRepository";

export class GetTeamRosterUseCase {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  async execute(teamId: number): Promise<RosterPlayer[]> {
    return await this.rosterPlayerRepository.findByTeamId(teamId)
  }
}
