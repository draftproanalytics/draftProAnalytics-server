import type { PrismaClient, TeamNeed } from '@prisma/client'
import type { ITeamNeedRepository, UpsertTeamNeedInput } from '../../domain/services/repositories/ITeamNeedRepository'
import type { TeamNeedDto, TeamNeedSource, TeamNeedStatus } from '../../domain/dtos/TeamNeedDtos'

const toDto = (row: TeamNeed): TeamNeedDto => ({
  id: row.id,
  teamId: row.teamId,
  position: row.position,
  priority: row.priority,
  draftYear: row.draftYear,
  needScore: row.needScore === null ? null : Number(row.needScore),
  source: row.source as TeamNeedSource,
  status: row.status as TeamNeedStatus,
  asOfDate: row.asOfDate ? row.asOfDate.toISOString().slice(0, 10) : null,
  algorithmVersion: row.algorithmVersion,
  rationaleJson: row.rationaleJson,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null
})

export class PrismaTeamNeedRepository implements ITeamNeedRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listByTeamIdAndDraftYear(teamId: number, draftYear: number): Promise<TeamNeedDto[]> {
    const rows = await this.prisma.teamNeed.findMany({
      where: { teamId, draftYear },
      orderBy: [{ priority: 'asc' }, { needScore: 'desc' }, { position: 'asc' }]
    })
    return rows.map(toDto)
  }

  public async upsert(input: UpsertTeamNeedInput): Promise<TeamNeedDto> {
    const row = await this.prisma.teamNeed.upsert({
      where: {
        teamId_draftYear_position: {
          teamId: input.teamId,
          draftYear: input.draftYear,
          position: input.position
        }
      },
      create: {
        teamId: input.teamId,
        draftYear: input.draftYear,
        position: input.position,
        priority: input.priority,
        needScore: input.needScore ?? null,
        source: input.source ?? 'MANUAL',
        status: input.status ?? 'APPROVED'
      },
      update: {
        priority: input.priority,
        needScore: input.needScore ?? undefined,
        source: input.source ?? undefined,
        status: input.status ?? undefined
      }
    })
    return toDto(row)
  }

  public async review(id: number, status: 'APPROVED' | 'REJECTED', reviewedByPersonId?: number): Promise<TeamNeedDto> {
    const row = await this.prisma.teamNeed.update({
      where: { id },
      data: { status, reviewedByPersonId: reviewedByPersonId ?? null, reviewedAt: new Date() }
    })
    return toDto(row)
  }

  public async deleteByTeamIdDraftYearAndPosition(teamId: number, draftYear: number, position: string): Promise<void> {
    await this.prisma.teamNeed.delete({
      where: { teamId_draftYear_position: { teamId, draftYear, position } }
    })
  }
}
