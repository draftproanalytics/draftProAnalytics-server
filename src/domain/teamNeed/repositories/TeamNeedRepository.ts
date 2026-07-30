// src/infrastructure/repositories/TeamNeedRepository.ts
 
import { PrismaClient } from '@prisma/client'
import { TeamNeed } from '../../../domain/team/entity/TeamNeed'

export interface TeamNeedRepository {
  findByTeamId(teamId: number, draftYear: number): Promise<TeamNeed[]>;
  create(teamNeed: Omit<TeamNeed, 'id'>): Promise<TeamNeed>;
  update(id: number, data: Partial<TeamNeed>): Promise<void>;
  delete(id: number): Promise<void>;
}