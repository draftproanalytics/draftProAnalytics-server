
// src/modules/roster/application/use-cases/GetRosterByPositionGroup.usecase.ts

import { RosterPlayer } from "../../domain/entities/rosterPlayer.entity";
import { IRosterPlayerRepository } from "../../domain/repositories/IRosterPlayerRepository";

export class GetRosterByPositionGroupUseCase {
  constructor(private readonly rosterPlayerRepository: IRosterPlayerRepository) {}

  async execute(teamId: number, positionGroup: string): Promise<RosterPlayer[]> {
    return await this.rosterPlayerRepository.findByPositionGroup(teamId, positionGroup)
  }
}
