// src/modules/roster/application/use-cases/GetAllRosterPlayers.usecase.ts

import { RosterPlayer } from "../../domain/entities/rosterPlayer.entity";
import { IRosterPlayerRepository } from "../../domain/repositories/IRosterPlayerRepository";

export class GetAllRosterPlayersUseCase {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  async execute(): Promise<RosterPlayer[]> {
    return await this.rosterPlayerRepository.findAll()
  }
}