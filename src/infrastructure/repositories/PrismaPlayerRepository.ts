// src/infrastructure/repositories/PrismaPlayerRepository.ts
import { IPlayerRepository, PlayerFilters } from '@/domain/player/repositories/IPlayerRepository';
import { Player } from '@/domain/player/entities/Player';
import { PlayerTeam, Prisma } from '@prisma/client';
import { PaginationParams, PaginatedResponse } from '@/shared/types/common';
import { NotFoundError } from '@/shared/errors/AppError';
import { prisma } from '../database/prisma';

export class PrismaPlayerRepository implements IPlayerRepository {
  // Define the select clause to ensure we get only the fields we need
  private readonly playerSelect = {
    id: true,
    espnAthleteId: true,
    firstName: true,
    lastName: true,
    age: true,
    height: true,
    weight: true,
    handSize: true,
    armLength: true,
    homeCity: true,
    homeState: true,
    university: true,
    status: true,
    position: true,
    yearEnteredLeague: true,
    prospectId: true,
  };

  async save(player: Player): Promise<Player> {
    const data = player.toPersistence();
    const { id, ...createData } = data;

    const savedPlayer = await prisma.player.create({
      data: createData,
      select: this.playerSelect,
    });

    return Player.fromPersistence(savedPlayer);
  }

  async findById(id: number): Promise<Player | null> {
    const player = await prisma.player.findUnique({
      where: { id },
      select: this.playerSelect,
    });

    return player ? Player.fromPersistence(player) : null;
  }

  async findAll(
    filters?: PlayerFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Player>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);
    const sortField = pagination?.sortField;
    const sortDirection: Prisma.SortOrder = pagination?.sortOrder === -1 ? 'desc' : 'asc';
    const isPlayerSortField = (value: typeof sortField): value is 'firstName' | 'lastName' | 'position' | 'university' =>
      value === 'firstName' || value === 'lastName' || value === 'position' || value === 'university';

    const orderBy: Prisma.PlayerOrderByWithRelationInput[] = isPlayerSortField(sortField)
      ? [{ [sortField]: sortDirection }, { id: 'asc' }]
      : [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }];

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: this.playerSelect,
      }),
      prisma.player.count({ where }),
    ]);

    return {
      data: players.map((player) => Player.fromPersistence(player)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  async upsertByEspnId(p: Player): Promise<Player> {
    const data = p.toPersistence();
    if (!data.espnAthleteId) {
      throw new Error('Cannot upsert Player without espnAthleteId');
    }

    const row = await prisma.player.upsert({
      where: { espnAthleteId: data.espnAthleteId },
      update: {
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        age: data.age ?? undefined,
        height: data.height ?? undefined,
        weight: data.weight ?? undefined,
        position: data.position ?? undefined,
        status: data.status ?? undefined,
      },
      create: data,
    });
    return Player.fromPersistence(row);
  }

  async findByEspnId(espnAthleteId: string): Promise<Player | null> {
    const row = await prisma.player.findUnique({ where: { espnAthleteId } });
    return row ? Player.fromPersistence(row) : null;
  }
  async update(id: number, player: Player): Promise<Player> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new NotFoundError('Player', id);
    }

    const data = player.toPersistence();
    const { id: _, ...updateData } = data;

    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: updateData,
      select: this.playerSelect,
    });

    return Player.fromPersistence(updatedPlayer);
  }

  async delete(id: number): Promise<void> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new NotFoundError('Player', id);
    }

    await prisma.player.delete({
      where: { id },
    });
  }

  async exists(id: number): Promise<boolean> {
    const count = await prisma.player.count({
      where: { id },
    });
    return count > 0;
  }

  // Fixed Method 1: Convert Prisma data to domain objects
  async findByTeamId(teamId: number): Promise<Player[]> {
    try {
      const playersData = await prisma.player.findMany({
        where: {
          PlayerTeam: {
            some: {
              teamId: teamId,
            },
          },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });

      // Convert raw Prisma data to domain objects
      return playersData.map((playerData) => Player.fromPersistence(playerData));
    } catch (error) {
      console.error('Error fetching players by team ID:', error);
      throw error;
    }
  }
  // Domain-specific query methods
  async findByName(firstName: string, lastName: string): Promise<Player[]> {
    const players = await prisma.player.findMany({
      where: {
        firstName: { equals: firstName },
        lastName: { equals: lastName },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  async findByPosition(position: string): Promise<Player[]> {
    const players = await prisma.player.findMany({
      where: {
        position: { equals: position },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  async findByUniversity(university: string): Promise<Player[]> {
    const players = await prisma.player.findMany({
      where: {
        university: { contains: university },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  async findByProspectId(prospectId: number): Promise<Player | null> {
    const player = await prisma.player.findFirst({
      where: { prospectId },
      select: this.playerSelect,
    });

    return player ? Player.fromPersistence(player) : null;
  }

  async findRookies(): Promise<Player[]> {
    const currentYear = new Date().getFullYear();

    const players = await prisma.player.findMany({
      where: {
        yearEnteredLeague: currentYear,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  async findVeterans(minYears: number = 5): Promise<Player[]> {
    const currentYear = new Date().getFullYear();
    const maxYearEntered = currentYear - minYears;

    const players = await prisma.player.findMany({
      where: {
        yearEnteredLeague: {
          lte: maxYearEntered,
        },
      },
      orderBy: [{ yearEnteredLeague: 'asc' }, { lastName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  async findByYearEnteredLeague(year: number): Promise<Player[]> {
    const players = await prisma.player.findMany({
      where: {
        yearEnteredLeague: year,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  async findByStatus(status: string): Promise<Player[]> {
    const players = await prisma.player.findMany({
      where: {
        status: { equals: status },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  async findByLocation(city?: string, state?: string): Promise<Player[]> {
    const where: any = {};

    if (city) {
      where.homeCity = { contains: city };
    }

    if (state) {
      where.homeState = { contains: state };
    }

    const players = await prisma.player.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  async findByPhysicalRange(
    minHeight?: number,
    maxHeight?: number,
    minWeight?: number,
    maxWeight?: number
  ): Promise<Player[]> {
    const where: any = {};

    if (minHeight !== undefined || maxHeight !== undefined) {
      where.height = {};
      if (minHeight !== undefined) where.height.gte = minHeight;
      if (maxHeight !== undefined) where.height.lte = maxHeight;
    }

    if (minWeight !== undefined || maxWeight !== undefined) {
      where.weight = {};
      if (minWeight !== undefined) where.weight.gte = minWeight;
      if (maxWeight !== undefined) where.weight.lte = maxWeight;
    }

    const players = await prisma.player.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: this.playerSelect,
    });

    return players.map((player) => Player.fromPersistence(player));
  }

  // Statistical queries
  async getAverageAge(): Promise<number> {
    const result = await prisma.player.aggregate({
      _avg: {
        age: true,
      },
    });

    return result._avg.age || 0;
  }

  async getAverageHeightByPosition(position: string): Promise<number | null> {
    const result = await prisma.player.aggregate({
      where: {
        position: { equals: position },
        height: { not: null },
      },
      _avg: {
        height: true,
      },
    });

    return result._avg.height;
  }

  async getAverageWeightByPosition(position: string): Promise<number | null> {
    const result = await prisma.player.aggregate({
      where: {
        position: { equals: position },
        weight: { not: null },
      },
      _avg: {
        weight: true,
      },
    });

    return result._avg.weight;
  }

  async countByPosition(): Promise<Array<{ position: string; count: number }>> {
    const result = await prisma.player.groupBy({
      by: ['position'],
      where: {
        position: { not: null },
      },
      _count: {
        position: true, // Count by the position field instead of _all
      },
    });

    // Sort the results by count in descending order
    return result
      .map((item) => ({
        position: item.position!,
        count: item._count?.position || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async countByUniversity(): Promise<Array<{ university: string; count: number }>> {
    const result = await prisma.player.groupBy({
      by: ['university'],
      where: {
        university: { not: null },
      },
      _count: {
        university: true, // Count by the university field instead of _all
      },
    });

    // Sort the results by count in descending order
    return result
      .map((item) => ({
        university: item.university!,
        count: item._count?.university || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  async countByStatus(): Promise<Array<{ status: string; count: number }>> {
    const result = await prisma.player.groupBy({
      by: ['status'],
      where: {
        status: { not: null },
      },
      _count: {
        status: true, // Count by the status field instead of _all
      },
    });

    // Sort the results by count in descending order
    return result
      .map((item) => ({
        status: item.status!,
        count: item._count?.status || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private buildWhereClause(filters?: PlayerFilters): object {
    if (!filters) return {};

    const where: Record<string, unknown> = {};

    if (filters.espnAthleteId) {
      where.espnAthleteId = { contains: filters.espnAthleteId };
    }

    if (filters.firstName) {
      where.firstName = { contains: filters.firstName };
    }

    if (filters.lastName) {
      where.lastName = { contains: filters.lastName };
    }

    if (filters.position) {
      where.position = { contains: filters.position };
    }

    if (filters.university) {
      where.university = { contains: filters.university };
    }

    if (filters.status) {
      where.status = { contains: filters.status };
    }

    if (filters.homeState) {
      where.homeState = { contains: filters.homeState };
    }

    if (filters.homeCity) {
      where.homeCity = { contains: filters.homeCity };
    }

    if (filters.minAge !== undefined || filters.maxAge !== undefined) {
      where.age = {};
      if (filters.minAge !== undefined) (where.age as any).gte = filters.minAge;
      if (filters.maxAge !== undefined) (where.age as any).lte = filters.maxAge;
    }

    if (filters.minHeight !== undefined || filters.maxHeight !== undefined) {
      where.height = {};
      if (filters.minHeight !== undefined) (where.height as any).gte = filters.minHeight;
      if (filters.maxHeight !== undefined) (where.height as any).lte = filters.maxHeight;
    }

    if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
      where.weight = {};
      if (filters.minWeight !== undefined) (where.weight as any).gte = filters.minWeight;
      if (filters.maxWeight !== undefined) (where.weight as any).lte = filters.maxWeight;
    }

    if (filters.yearEnteredLeague) {
      where.yearEnteredLeague = filters.yearEnteredLeague;
    }

    if (filters.prospectId) {
      where.prospectId = filters.prospectId;
    }

    if (filters.search) {
      const terms = filters.search.trim().split(/\s+/).filter(Boolean);
      if (terms.length > 0) {
        where.AND = terms.map((term) => ({
          OR: [
            { firstName: { contains: term } },
            { lastName: { contains: term } },
          ],
        }));
      }
    }

    return where;
  }
}
