// src/modules/roster/domain/repositories/IRosterPlayerRepository.ts

import { RosterPlayer } from '../entities/rosterPlayer.entity'

export interface IRosterPlayerRepository {
  findById(id: string): Promise<RosterPlayer | null>
  findByTeamId(teamId: number): Promise<RosterPlayer[]>
  findByPlayerId(playerId: string): Promise<RosterPlayer[]>
  findStarters(teamId: number): Promise<RosterPlayer[]>
  findByPositionGroup(teamId: number, positionGroup: string): Promise<RosterPlayer[]>
  findAll(): Promise<RosterPlayer[]>
  create(rosterPlayer: RosterPlayer): Promise<RosterPlayer>
  update(id: string, rosterPlayer: Partial<RosterPlayer>): Promise<RosterPlayer>
  delete(id: string): Promise<void>
  exists(teamId: number, playerId: string): Promise<boolean>
}