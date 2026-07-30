import type { PrismaClient } from '@prisma/client'
import type { TeamNeedRepository, TeamNeedWeight, TeamNeedPriority } from '../../../domain/repositories/TeamNeedRepository'

export class PrismaTeamNeedRepository implements TeamNeedRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getTeamNeedWeights(teamId: number, draftYear: number): Promise<TeamNeedWeight[]> {
    const rows = await this.prisma.teamNeed.findMany({
      where: { teamId, draftYear, status: 'APPROVED' },
      orderBy: [{ priority: 'asc' }, { needScore: 'desc' }]
    })

    return rows.map((row) => {
      const priority = Math.max(1, Math.min(5, row.priority))
      return { position: row.position, weight: 6 - priority }
    })
  }

  public async listTopNeeds(teamId: number, draftYear: number, limit: number): Promise<TeamNeedPriority[]> {
    const take = Math.max(1, Math.min(limit, 10))
    const rows = await this.prisma.teamNeed.findMany({
      where: { teamId, draftYear, status: 'APPROVED' },
      orderBy: [{ priority: 'asc' }, { needScore: 'desc' }, { position: 'asc' }],
      take
    })

    return rows.map((row) => ({ position: row.position, priority: row.priority }))
  }
}
