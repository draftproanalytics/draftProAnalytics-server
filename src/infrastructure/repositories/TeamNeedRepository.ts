import type { PrismaClient, TeamNeed as PrismaTeamNeed } from '@prisma/client'
import { TeamNeed } from '../../domain/team/entity/TeamNeed'

export class TeamNeedRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findByTeamId(teamId: number, draftYear: number): Promise<TeamNeed[]> {
    const needs = await this.prisma.teamNeed.findMany({
      where: { teamId, draftYear },
      orderBy: { priority: 'asc' }
    })

    return needs.map((need) => TeamNeed.fromDatabase(need))
  }

  public async create(teamNeed: Omit<TeamNeed, 'id'>): Promise<TeamNeed> {
    const created = await this.prisma.teamNeed.create({
      data: {
        teamId: teamNeed.teamId,
        position: teamNeed.position,
        priority: teamNeed.priority,
        draftYear: teamNeed.draftYear
      }
    })

    return TeamNeed.fromDatabase(created)
  }

  public async update(id: number, data: Partial<TeamNeed>): Promise<void> {
    await this.prisma.teamNeed.update({
      where: { id },
      data: {
        priority: data.priority,
        updatedAt: new Date()
      }
    })
  }

  public async delete(id: number): Promise<void> {
    await this.prisma.teamNeed.delete({ where: { id } })
  }
}

export type TeamNeedDatabaseRecord = PrismaTeamNeed
