import { Prisma } from '@prisma/client';
import {
  ICombineScoreRepository,
  CombineScoreFilters,
  CombineScoreWorkspaceFilters,
  CombineMeasurementAverages,
  CombineScoreWorkspaceRow,
} from '@/domain/combineScore/repositories/ICombineScoreRepository';
import { CombineScore } from '@/domain/combineScore/entities/CombineScore';
import { PaginationParams, PaginatedResponse } from '@/shared/types/common';
import { NotFoundError } from '@/shared/errors/AppError';
import { prisma } from '../database/prisma';

export class PrismaCombineScoreRepository implements ICombineScoreRepository {
  async save(combineScore: CombineScore): Promise<CombineScore> {
    const { id, ...createData } = combineScore.toPersistence();
    const saved = await prisma.combineScore.create({ data: createData });
    return CombineScore.fromPersistence(saved);
  }

  async findById(id: number): Promise<CombineScore | null> {
    const row = await prisma.combineScore.findUnique({ where: { id } });
    return row ? CombineScore.fromPersistence(row) : null;
  }

  async findAll(filters?: CombineScoreFilters, pagination?: PaginationParams): Promise<PaginatedResponse<CombineScore>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const [rows, total] = await Promise.all([
      prisma.combineScore.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
      prisma.combineScore.count({ where }),
    ]);
    return {
      data: rows.map((row) => CombineScore.fromPersistence(row)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findWorkspace(
    filters?: CombineScoreWorkspaceFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResponse<CombineScoreWorkspaceRow>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 25;
    const skip = (page - 1) * limit;
    const where = this.buildWorkspaceWhere(filters);
    const orderBy = this.buildWorkspaceOrderBy(filters);

    const [rows, total] = await Promise.all([
      prisma.prospect.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          position: true,
          college: true,
          draftYear: true,
          draftStatus: true,
          CombineScore: true,
        },
      }),
      prisma.prospect.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        prospect: {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          position: row.position,
          college: row.college,
          draftYear: row.draftYear ?? undefined,
          draftStatus: String(row.draftStatus),
        },
        score: row.CombineScore ? CombineScore.fromPersistence(row.CombineScore) : undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async update(id: number, combineScore: CombineScore): Promise<CombineScore> {
    if (!(await this.exists(id))) throw new NotFoundError('CombineScore', id);
    const { id: _, ...updateData } = combineScore.toPersistence();
    const updated = await prisma.combineScore.update({ where: { id }, data: updateData });
    return CombineScore.fromPersistence(updated);
  }

  async delete(id: number): Promise<void> {
    if (!(await this.exists(id))) throw new NotFoundError('CombineScore', id);
    await prisma.combineScore.delete({ where: { id } });
  }

  async exists(id: number): Promise<boolean> {
    return (await prisma.combineScore.count({ where: { id } })) > 0;
  }

  async findByPlayerId(playerId: number): Promise<CombineScore | null> {
    const row = await prisma.combineScore.findFirst({ where: { playerId } });
    return row ? CombineScore.fromPersistence(row) : null;
  }

  async findByPlayerIds(playerIds: number[]): Promise<CombineScore[]> {
    if (playerIds.length === 0) return [];
    const rows = await prisma.combineScore.findMany({ where: { playerId: { in: playerIds } } });
    return rows.map((row) => CombineScore.fromPersistence(row));
  }

  async findByProspectId(prospectId: number): Promise<CombineScore | null> {
    const row = await prisma.combineScore.findUnique({ where: { prospectId } });
    return row ? CombineScore.fromPersistence(row) : null;
  }

  async findByProspectIds(prospectIds: number[]): Promise<CombineScore[]> {
    if (prospectIds.length === 0) return [];
    const rows = await prisma.combineScore.findMany({ where: { prospectId: { in: prospectIds } } });
    return rows.map((row) => CombineScore.fromPersistence(row));
  }

  async findTopPerformers(metric: string, limit: number = 10): Promise<CombineScore[]> {
    const supportedMetrics = new Set(['fortyTime', 'tenYardSplit', 'twentyYardShuttle', 'threeCone', 'verticalLeap', 'broadJump', 'benchPress']);
    if (!supportedMetrics.has(metric)) return [];
    const lowerIsBetter = new Set(['fortyTime', 'tenYardSplit', 'twentyYardShuttle', 'threeCone']);
    const rows = await prisma.combineScore.findMany({
      where: { [metric]: { not: null } },
      orderBy: { [metric]: lowerIsBetter.has(metric) ? 'asc' : 'desc' },
      take: limit,
    });
    return rows.map((row) => CombineScore.fromPersistence(row));
  }

  async findByAthleticScoreRange(minScore: number, maxScore: number): Promise<CombineScore[]> {
    const rows = await prisma.combineScore.findMany({
      where: {
        OR: [
          { fortyTime: { not: null } },
          { verticalLeap: { not: null } },
          { broadJump: { not: null } },
          { twentyYardShuttle: { not: null } },
          { threeCone: { not: null } },
          { benchPress: { not: null } },
        ],
      },
    });
    return rows
      .map((row) => CombineScore.fromPersistence(row))
      .filter((score) => {
        const value = score.getOverallAthleticScore();
        return value >= minScore && value <= maxScore;
      });
  }

  async getMeasurementAverages(): Promise<CombineMeasurementAverages> {
    const result = await prisma.combineScore.aggregate({
      _avg: { height: true, weight: true, fortyTime: true, verticalLeap: true, benchPress: true },
    });
    const toNumber = (value: number | null | undefined): number | undefined => value == null ? undefined : Number(value);
    return {
      height: toNumber(result._avg.height),
      weight: toNumber(result._avg.weight),
      fortyTime: toNumber(result._avg.fortyTime),
      verticalLeap: toNumber(result._avg.verticalLeap),
      benchPress: toNumber(result._avg.benchPress),
    };
  }

  private buildWhereClause(filters?: CombineScoreFilters): Prisma.CombineScoreWhereInput {
    if (!filters) return {};
    const where: Prisma.CombineScoreWhereInput = {};
    if (filters.playerId !== undefined) where.playerId = filters.playerId;
    if (filters.prospectId !== undefined) where.prospectId = filters.prospectId;
    if (filters.fortyTimeMin !== undefined || filters.fortyTimeMax !== undefined) {
      where.fortyTime = {
        ...(filters.fortyTimeMin !== undefined ? { gte: filters.fortyTimeMin } : {}),
        ...(filters.fortyTimeMax !== undefined ? { lte: filters.fortyTimeMax } : {}),
      };
    }
    if (filters.verticalLeapMin !== undefined || filters.verticalLeapMax !== undefined) {
      where.verticalLeap = {
        ...(filters.verticalLeapMin !== undefined ? { gte: filters.verticalLeapMin } : {}),
        ...(filters.verticalLeapMax !== undefined ? { lte: filters.verticalLeapMax } : {}),
      };
    }
    if (filters.broadJumpMin !== undefined || filters.broadJumpMax !== undefined) {
      where.broadJump = {
        ...(filters.broadJumpMin !== undefined ? { gte: filters.broadJumpMin } : {}),
        ...(filters.broadJumpMax !== undefined ? { lte: filters.broadJumpMax } : {}),
      };
    }
    if (filters.hasCompleteWorkout === true) {
      Object.assign(where, {
        fortyTime: { not: null }, tenYardSplit: { not: null }, verticalLeap: { not: null }, broadJump: { not: null },
        twentyYardShuttle: { not: null }, threeCone: { not: null }, benchPress: { not: null },
      });
    }
    return where;
  }

  private buildWorkspaceWhere(filters?: CombineScoreWorkspaceFilters): Prisma.ProspectWhereInput {
    const where: Prisma.ProspectWhereInput = {};
    if (!filters) return where;

    if (filters.draftYear !== undefined) where.draftYear = filters.draftYear;
    if (filters.position) where.position = filters.position;
    if (filters.college) where.college = { contains: filters.college };

    if (filters.playerName) {
      const normalized = filters.playerName.trim();
      const parts = normalized.split(/\s+/);
      const nameFilters: Prisma.ProspectWhereInput[] = [
        { firstName: { contains: normalized } },
        { lastName: { contains: normalized } },
      ];
      if (parts.length > 1) {
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');
        nameFilters.unshift(
          { AND: [{ firstName: { contains: firstName } }, { lastName: { contains: lastName } }] },
          { AND: [{ firstName: { contains: lastName } }, { lastName: { contains: firstName } }] },
        );
      }
      where.OR = nameFilters;
    }

    const missingMetricFilters: Prisma.CombineScoreWhereInput[] = [
      { fortyTime: null },
      { tenYardSplit: null },
      { verticalLeap: null },
      { broadJump: null },
      { twentyYardShuttle: null },
      { threeCone: null },
      { benchPress: null },
    ];

    if (filters.combineStatus === 'MISSING') {
      where.CombineScore = { is: null };
    } else if (filters.combineStatus === 'COMPLETE') {
      where.CombineScore = {
        is: {
          fortyTime: { not: null },
          tenYardSplit: { not: null },
          verticalLeap: { not: null },
          broadJump: { not: null },
          twentyYardShuttle: { not: null },
          threeCone: { not: null },
          benchPress: { not: null },
        },
      };
    } else if (filters.combineStatus === 'PARTIAL') {
      where.CombineScore = { is: { OR: missingMetricFilters } };
    }

    return where;
  }

  private buildWorkspaceOrderBy(filters?: CombineScoreWorkspaceFilters): Prisma.ProspectOrderByWithRelationInput[] {
    const direction: Prisma.SortOrder = filters?.sortOrder === 'desc' ? 'desc' : 'asc';
    switch (filters?.sortField) {
      case 'draftYear': return [{ draftYear: direction }, { lastName: 'asc' }, { firstName: 'asc' }];
      case 'position': return [{ position: direction }, { lastName: 'asc' }, { firstName: 'asc' }];
      case 'college': return [{ college: direction }, { lastName: 'asc' }, { firstName: 'asc' }];
      case 'height': return [{ CombineScore: { height: direction } }, { lastName: 'asc' }];
      case 'weight': return [{ CombineScore: { weight: direction } }, { lastName: 'asc' }];
      case 'handSize': return [{ CombineScore: { handSize: direction } }, { lastName: 'asc' }];
      case 'armLength': return [{ CombineScore: { armLength: direction } }, { lastName: 'asc' }];
      case 'fortyTime': return [{ CombineScore: { fortyTime: direction } }, { lastName: 'asc' }];
      case 'tenYardSplit': return [{ CombineScore: { tenYardSplit: direction } }, { lastName: 'asc' }];
      case 'verticalLeap': return [{ CombineScore: { verticalLeap: direction } }, { lastName: 'asc' }];
      case 'broadJump': return [{ CombineScore: { broadJump: direction } }, { lastName: 'asc' }];
      case 'threeCone': return [{ CombineScore: { threeCone: direction } }, { lastName: 'asc' }];
      case 'twentyYardShuttle': return [{ CombineScore: { twentyYardShuttle: direction } }, { lastName: 'asc' }];
      case 'benchPress': return [{ CombineScore: { benchPress: direction } }, { lastName: 'asc' }];
      case 'name':
      default:
        return [{ lastName: direction }, { firstName: direction }, { id: 'asc' }];
    }
  }
}
