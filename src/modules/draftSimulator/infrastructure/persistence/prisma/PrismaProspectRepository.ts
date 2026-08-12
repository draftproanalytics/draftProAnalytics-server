// sports_mgmt_app_server/src/modules/draftSimulator/infrastructure/persistence/prisma/PrismaProspectRepository.ts
import type { PrismaClient, Prisma } from '@prisma/client'
import type {
  ProspectRepository,
  ProspectFilters,
  AvailableProspect
} from '../../../domain/repositories/ProspectRepository'
import type { ProspectListItemDto } from '../../../application/dto/ProspectListDto'

const OFFENSE = new Set(['QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C'])
const DEFENSE = new Set(['DT', 'EDGE', 'DE', 'LB', 'CB', 'S'])
const ST = new Set(['K', 'P'])

function positionSide(pos: string): 'offense' | 'defense' | 'st' | 'other' {
  const p = pos.toUpperCase()
  if (OFFENSE.has(p)) return 'offense'
  if (DEFENSE.has(p)) return 'defense'
  if (ST.has(p)) return 'st'
  return 'other'
}

function buildProspectWhere(draftYear: number, filters: ProspectFilters): Prisma.ProspectWhereInput {
  const and: Prisma.ProspectWhereInput[] = []

  // Year preference: match this year OR null-year rows
  and.push({ OR: [{ draftYear }, { draftYear: null }] })

  if (filters.position) {
    and.push({ position: filters.position })
  }

  const q = (filters.q ?? '').trim()
  if (q.length > 0) {
    // MySQL in Prisma: remove `mode: 'insensitive'` (not supported in your client)
    and.push({
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { college: { contains: q } }
      ]
    })
  }

  return {
    draftStatus: 'PRE_DRAFT',
    AND: and
  }
}

export class PrismaProspectRepository implements ProspectRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listAvailable(
    simulationId: number,
    draftYear: number,
    rankingSource: string,
    filters: ProspectFilters
  ): Promise<AvailableProspect[]> {
    const draftedIds = await this.prisma.draftSimulationPick.findMany({
      where: { draftSimulationId: simulationId, draftedProspectId: { not: null } },
      select: { draftedProspectId: true }
    })

    const notIn = draftedIds
      .map((x) => x.draftedProspectId)
      .filter((x): x is number => typeof x === 'number')

    const take = Math.max(1, Math.min(filters.limit ?? 300, 500))

    const rows = await this.prisma.prospectRanking.findMany({
      where: {
        source: rankingSource,
        prospectId: { notIn },
        Prospect: buildProspectWhere(draftYear, filters)
      },
      orderBy: [{ overallRank: 'asc' }],
      take,
      include: {
        Prospect: { select: { position: true } }
      }
    })

    const side = filters.side ?? 'all'
    const filtered = side === 'all'
      ? rows
      : rows.filter((r) => positionSide(r.Prospect.position) === side)

    return filtered.map((r) => ({
      id: r.prospectId,
      position: r.Prospect.position,
      overallRank: r.overallRank
    }))
  }

  public async listForUi(
    simulationId: number,
    draftYear: number,
    rankingSource: string,
    filters: ProspectFilters
  ): Promise<ProspectListItemDto[]> {
    const draftedIds = await this.prisma.draftSimulationPick.findMany({
      where: { draftSimulationId: simulationId, draftedProspectId: { not: null } },
      select: { draftedProspectId: true }
    })

    const notIn = draftedIds
      .map((x) => x.draftedProspectId)
      .filter((x): x is number => typeof x === 'number')

    const take = Math.max(1, Math.min(filters.limit ?? 200, 400))

    const rows = await this.prisma.prospectRanking.findMany({
      where: {
        source: rankingSource,
        prospectId: { notIn },
        Prospect: buildProspectWhere(draftYear, filters)
      },
      orderBy: [{ overallRank: 'asc' }],
      take,
      include: {
        Prospect: { select: { firstName: true, lastName: true, position: true, college: true } }
      }
    })

    const side = filters.side ?? 'all'
    const filtered = side === 'all'
      ? rows
      : rows.filter((r) => positionSide(r.Prospect.position) === side)

    return filtered.map((r) => ({
      id: r.prospectId,
      fullName: `${r.Prospect.firstName} ${r.Prospect.lastName}`,
      position: r.Prospect.position,
      college: r.Prospect.college,
      overallRank: r.overallRank,
      grade: r.grade ? r.grade.toNumber() : null
    }))
  }
}
