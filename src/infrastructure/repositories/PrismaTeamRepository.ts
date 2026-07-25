// src/infrastructure/repositories/PrismaTeamRepository.ts
import {
  ITeamRepository,
  TeamFilters,
  TeamUpsertInput,
  BulkUpsertResult,
} from '@/domain/team/repositories/ITeamRepository';
import { Team } from '@/domain/team/entities/Team';
import { PaginationParams, PaginatedResponse } from '@/shared/types/common';
import { NotFoundError } from '@/shared/errors/AppError';
import { prisma } from '../database/prisma';
import { createLogger } from '@/utils/Logger';

// In a service file

type TeamIdEspnRow = { id: number; espnTeamId: number | null };
type TeamIdEspnPair = { id: number; espnTeamId: number };
export class PrismaTeamRepository implements ITeamRepository {
  private logger = createLogger('TeamService');
  // -------------------------------------------------------------
  // Core CRUD
  // -------------------------------------------------------------
  async save(team: Team): Promise<Team> {
    const data = team.toPersistence();
    const { id, ...createData } = data;

    const savedTeam = await prisma.team.create({ data: createData });
    return Team.fromPersistence(savedTeam);
  }

  async findById(id: number): Promise<Team | null> {
    const team = await prisma.team.findUnique({ where: { id } });
    return team ? Team.fromPersistence(team) : null;
  }

  async findAll(
    filters?: TeamFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Team>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);
    const allowedSortFields = [
      'name',
      'city',
      'state',
      'conference',
      'division',
      'stadium',
    ] as const;
    type TeamSortField = typeof allowedSortFields[number];

    const requestedSortField = pagination?.sortField;
    const sortField: TeamSortField = allowedSortFields.includes(
      requestedSortField as TeamSortField
    )
      ? requestedSortField as TeamSortField
      : 'name';
    const sortDirection = pagination?.sortOrder === -1 ? 'desc' : 'asc';

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { [sortField]: sortDirection },
          ...(sortField === 'name' ? [] : [{ name: 'asc' as const }]),
        ],
      }),
      prisma.team.count({ where }),
    ]);

    return {
      data: teams.map((t) => Team.fromPersistence(t)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findAllTeamNameAndIds(): Promise<any[]> {
    // Get Id/Name value pairs for dropdown select list
    const teams = await prisma.$queryRaw`
      SELECT id, name FROM Team ORDER BY name ASC`;

    return teams as any[];
  }

  async update(id: number, team: Team): Promise<Team> {
    const exists = await this.exists(id);
    if (!exists) throw new NotFoundError('Team', id);

    const data = team.toPersistence();
    const { id: _, ...updateData } = data;

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: updateData,
    });

    return Team.fromPersistence(updatedTeam);
  }

  async delete(id: number): Promise<void> {
    const exists = await this.exists(id);
    if (!exists) throw new NotFoundError('Team', id);

    await prisma.team.delete({ where: { id } });
  }

  async exists(id: number): Promise<boolean> {
    const count = await prisma.team.count({ where: { id } });
    return count > 0;
  }

  // -------------------------------------------------------------
  // Existing domain queries
  // -------------------------------------------------------------
  async findByName(name: string): Promise<Team | null> {
    const team = await prisma.team.findFirst({
      where: { name: { equals: name } },
    });
    return team ? Team.fromPersistence(team) : null;
  }

  async findByConference(conference: string): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { conference: { equals: conference } },
      orderBy: { name: 'asc' },
    });
    return teams.map((t) => Team.fromPersistence(t));
  }

  async findByDivision(division: string): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { division: { equals: division } },
      orderBy: { name: 'asc' },
    });
    return teams.map((t) => Team.fromPersistence(t));
  }

  async findByLocation(city: string, state: string): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { AND: [{ city: { equals: city } }, { state: { equals: state } }] },
      orderBy: { name: 'asc' },
    });
    return teams.map((t) => Team.fromPersistence(t));
  }

  async findByState(state: string): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { state: { equals: state } },
      orderBy: { name: 'asc' },
    });
    return teams.map((t) => Team.fromPersistence(t));
  }

  async findByScheduleId(scheduleId: number): Promise<Team | null> {
    const team = await prisma.team.findFirst({ where: { scheduleId } });
    return team ? Team.fromPersistence(team) : null;
  }

  async findTeamsWithSchedules(): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { scheduleId: { not: null } },
      orderBy: { name: 'asc' },
    });
    return teams.map((t) => Team.fromPersistence(t));
  }

  async findTeamsWithoutSchedules(): Promise<Team[]> {
    const teams = await prisma.team.findMany({
      where: { scheduleId: null },
      orderBy: { name: 'asc' },
    });
    return teams.map((t) => Team.fromPersistence(t));
  }

  async countByConference(): Promise<{ conference: string; count: number }[]> {
    const result = await prisma.team.groupBy({
      by: ['conference'],
      _count: { conference: true },
      where: { conference: { not: null } },
      orderBy: { conference: 'asc' },
    });

    return result.map((item) => ({
      conference: item.conference!,
      count: item._count.conference,
    }));
  }

  async countByDivision(): Promise<{ division: string; count: number }[]> {
    const result = await prisma.team.groupBy({
      by: ['division'],
      _count: { division: true },
      where: { division: { not: null } },
      orderBy: { division: 'asc' },
    });

    return result.map((item) => ({
      division: item.division!,
      count: item._count.division,
    }));
  }

  // -------------------------------------------------------------
  // NEW — ESPN mapping & fast lookups
  // -------------------------------------------------------------

  async upsertFromEspn(input: TeamUpsertInput): Promise<Team> {
    // Try by espnTeamId first
    let existing = await prisma.team.findFirst({
      where: { espnTeamId: input.espnTeamId },
    });

    // If not found, try by abbreviation
    if (!existing && input.abbreviation) {
      existing = await prisma.team.findFirst({
        where: { abbreviation: input.abbreviation },
      });
    }

    if (existing) {
      const updated = await prisma.team.update({
        where: { id: existing.id },
        data: {
          espnTeamId: input.espnTeamId,
          abbreviation: input.abbreviation ?? existing.abbreviation,
          name: input.name ?? existing.name ?? input.displayName ?? null,
          city: input.location ?? existing.city ?? null,
          // optionally store displayName/shortDisplayName if your model has them
        },
      });
      return Team.fromPersistence(updated);
    } else {
      const created = await prisma.team.create({
        data: {
          espnTeamId: input.espnTeamId,
          abbreviation: input.abbreviation ?? null,
          name: input.name ?? input.displayName ?? 'Unknown',
          city: input.location ?? null,
        },
      });
      return Team.fromPersistence(created);
    }
  }

  async upsertFromEspnGetId(input: TeamUpsertInput): Promise<number> {
    const t = await this.upsertFromEspn(input);
    if (!t.id) {
      // Team entity always should have id after persistence
      const again = await this.findByEspnTeamId(input.espnTeamId);
      if (!again?.id) throw new Error('Failed to resolve Team.id after upsertFromEspn');
      return again.id;
    }
    return t.id;
  }

  async upsertManyFromEspn(inputs: TeamUpsertInput[]): Promise<BulkUpsertResult> {
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
      const before = await prisma.team.findFirst({
        where: {
          OR: [{ espnTeamId: input.espnTeamId }, { abbreviation: input.abbreviation ?? '' }],
        },
      });

      if (before) {
        await prisma.team.update({
          where: { id: before.id },
          data: {
            espnTeamId: input.espnTeamId,
            abbreviation: input.abbreviation ?? before.abbreviation,
            name: input.name ?? before.name ?? input.displayName ?? null,
            city: input.location ?? before.city ?? null,
          },
        });
        updated++;
      } else {
        await prisma.team.create({
          data: {
            espnTeamId: input.espnTeamId,
            abbreviation: input.abbreviation ?? null,
            name: input.name ?? input.displayName ?? 'Unknown',
            city: input.location ?? null,
          },
        });
        created++;
      }
    }

    return { created, updated, total: inputs.length };
  }

  async findIdByEspnTeamId(espnTeamId: number): Promise<number | null> {
    const t = await prisma.team.findFirst({
      where: { espnTeamId },
      select: { id: true },
    });
    return t?.id ?? null;
  }

  async findByEspnTeamId(espnTeamId: number): Promise<Team | null> {
    const t = await prisma.team.findFirst({ where: { espnTeamId } });
    return t ? Team.fromPersistence(t) : null;
  }

  // infrastructure repo
  async findManyByIds(ids: number[]): Promise<TeamIdEspnPair[]> {
    if (ids.length === 0) return []

    const rows = await prisma.team.findMany({
      where: { id: { in: ids } },
      select: { id: true, espnTeamId: true },
    })
    this.logger.debug("Rows found: "+rows.length)

    // espnTeamId is nullable in Prisma, so filter and narrow
    const out: TeamIdEspnPair[] = []
    for (const r of rows) {
      
      if (typeof r.espnTeamId === 'number' && Number.isFinite(r.espnTeamId)) {
        out.push({ id: r.id, espnTeamId: r.espnTeamId })
        this.logger.debug("id: "+r.id+"  espnTeamId: "+r.espnTeamId)
      }
    }
    return out
  }
  async findManyByIdsWithEspnTeamId(dbIds: number[]): Promise<TeamIdEspnPair[]> {
    if (dbIds.length === 0) return [];

    const rows = await prisma.team.findMany({
      where: {
        id: { in: dbIds },
        espnTeamId: { not: null },
      },
      select: { id: true, espnTeamId: true },
    });

    // espnTeamId is guaranteed non-null due to the where clause above
    return rows.map((r) => ({ id: r.id, espnTeamId: r.espnTeamId as number }));
  }

  async findIdByAbbreviation(abbreviation: string): Promise<number | null> {
    const t = await prisma.team.findFirst({
      where: { abbreviation },
      select: { id: true },
    });
    return t?.id ?? null;
  }

  async findByAbbreviation(abbreviation: string): Promise<Team | null> {
    const t = await prisma.team.findFirst({ where: { abbreviation } });
    return t ? Team.fromPersistence(t) : null;
  }

  async ensureMappingFromEspn(input: TeamUpsertInput): Promise<number> {
    // Try ESPN id first
    const byEspn = await this.findIdByEspnTeamId(input.espnTeamId);
    if (byEspn) return byEspn;

    // Try abbreviation
    if (input.abbreviation) {
      const byAbbr = await this.findIdByAbbreviation(input.abbreviation);
      if (byAbbr) {
        // backfill espnTeamId if missing
        await prisma.team.update({
          where: { id: byAbbr },
          data: { espnTeamId: input.espnTeamId },
        });
        return byAbbr;
      }
    }

    // Create new record
    return await this.upsertFromEspnGetId(input);
  }

  // -------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------
  private buildWhereClause(filters?: TeamFilters): object {
    if (!filters) return {};

    const where: Record<string, unknown> = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }
    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.state) {
      where.state = { contains: filters.state, mode: 'insensitive' };
    }
    if (filters.conference) {
      where.conference = { contains: filters.conference, mode: 'insensitive' };
    }
    if (filters.division) {
      where.division = { contains: filters.division, mode: 'insensitive' };
    }
    if (filters.stadium) {
      where.stadium = { contains: filters.stadium, mode: 'insensitive' };
    }
    if (filters.scheduleId !== undefined) {
      where.scheduleId = filters.scheduleId;
    }

    // NEW: quick filters
    if (filters.abbreviation) {
      where.abbreviation = { equals: filters.abbreviation };
    }
    if (filters.espnTeamId !== undefined) {
      where.espnTeamId = filters.espnTeamId;
    }

    return where;
  }
}
