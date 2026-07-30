// src/infrastructure/repositories/PrismaProspectRepository.ts
import { IProspectRepository, ProspectFilters } from '@/domain/prospect/repositories/IProspectRepository';
import { Prospect } from '@/domain/prospect/entities/Prospect';
import { PaginationParams, PaginatedResponse } from '@/shared/types/common';
import { NotFoundError } from '@/shared/errors/AppError';
import { prisma } from '../database/prisma';

export class PrismaProspectRepository implements IProspectRepository {
  findAvailable(): unknown {
    throw new Error('Method not implemented.');
  }
  
  private convertToProspect(prospectData: any): Prospect {
    return Prospect.fromPersistence({
      ...prospectData,
      createdAt: prospectData.createdAt || new Date(),
      updatedAt: prospectData.updatedAt || new Date(),
    });
  }
  async save(prospect: Prospect): Promise<Prospect> {
    const data = prospect.toPersistence();
    const { id, ...createData } = data;

    const savedProspect = await prisma.prospect.create({
      data: createData,
    });

    return this.convertToProspect(savedProspect);
  }

  async findById(id: number): Promise<Prospect | null> {
    const prospect = await prisma.prospect.findUnique({
      where: { id },
    });

    return prospect ? this.convertToProspect(prospect) : null;
  }

  async findAll(
    filters?: ProspectFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Prospect>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);

    const [prospects, total] = await Promise.all([
      prisma.prospect.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      }),
      prisma.prospect.count({ where }),
    ]);

    return {
      data: prospects.map((prospect) => this.convertToProspect(prospect)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: number, prospect: Prospect): Promise<Prospect> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new NotFoundError('Prospect', id);
    }

    const data = prospect.toPersistence();
    const { id: _, ...updateData } = data;

    const updatedProspect = await prisma.prospect.update({
      where: { id },
      data: updateData,
    });

    return this.convertToProspect(updatedProspect);
  }

  async delete(id: number): Promise<void> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new NotFoundError('Prospect', id);
    }

    await prisma.prospect.delete({
      where: { id },
    });
  }

  async exists(id: number): Promise<boolean> {
    const count = await prisma.prospect.count({
      where: { id },
    });
    return count > 0;
  }

  async findByPosition(position: string, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>> {
    return this.findAll({ position }, pagination);
  }

  async findByCollege(college: string, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>> {
    return this.findAll({ college }, pagination);
  }

  async findUndrafted(pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>> {
    return this.findAll({ drafted: false }, pagination);
  }

  async findDrafted(draftYear: number, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>> {
    const filters: ProspectFilters = { drafted: true };
    if (draftYear) {
      filters.draftYear = draftYear;
    }
    return this.findAll(filters, pagination);
  }

  async findByTeam(teamId: number, pagination?: PaginationParams): Promise<PaginatedResponse<Prospect>> {
    return this.findAll({ teamId }, pagination);
  }

  async findTopAthletes(limit: number = 10): Promise<Prospect[]> {
    // Find prospects with complete combine scores and good athleticism
    const prospects = await prisma.prospect.findMany({
      where: {
        fortyTime: { not: null },
        verticalLeap: { not: null },
        benchPress: { not: null },
        broadJump: { not: null },
        threeCone: { not: null },
        twentyYardShuttle: { not: null },
      },
      orderBy: [
        { fortyTime: 'asc' }, // Faster 40 time is better
        { verticalLeap: 'desc' }, // Higher vertical leap is better
        { benchPress: 'desc' }, // More bench press is better
      ],
      take: limit,
    });

    return prospects.map(prospect => this.convertToProspect(prospect));
  }

  async findByCombineScore(
    minFortyTime?: number,
    maxFortyTime?: number,
    minVerticalLeap?: number,
    maxVerticalLeap?: number,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Prospect>> {
    const filters: ProspectFilters = {};
    
    if (minFortyTime !== undefined) filters.minFortyTime = minFortyTime;
    if (maxFortyTime !== undefined) filters.maxFortyTime = maxFortyTime;
    if (minVerticalLeap !== undefined) filters.minVerticalLeap = minVerticalLeap;
    if (maxVerticalLeap !== undefined) filters.maxVerticalLeap = maxVerticalLeap;

    return this.findAll(filters, pagination);
  }

  async countByPosition(): Promise<{ position: string; count: number }[]> {
    const result = await prisma.prospect.groupBy({
      by: ['position'],
      _count: {
        position: true,
      },
      orderBy: {
        _count: {
          position: 'desc',
        },
      },
    });

    return result.map(item => ({
      position: item.position,
      count: item._count.position,
    }));
  }

  async countByCollege(): Promise<{ college: string; count: number }[]> {
    const result = await prisma.prospect.groupBy({
      by: ['college'],
      _count: {
        college: true,
      },
      orderBy: {
        _count: {
          college: 'desc',
        },
      },
    });

    return result.map(item => ({
      college: item.college,
      count: item._count.college,
    }));
  }

  async findDuplicates(): Promise<Prospect[]> {
    // Find prospects with same first name, last name, and college
    const duplicates = await prisma.prospect.findMany({
      where: {
        AND: [
          {
            firstName: {
              in: await prisma.prospect
                .groupBy({
                  by: ['firstName', 'lastName', 'college'],
                  having: {
                    firstName: {
                      _count: {
                        gt: 1,
                      },
                    },
                  },
                })
                .then(groups => groups.map(g => g.firstName)),
            },
          },
        ],
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
        { college: 'asc' },
      ],
    });

    return duplicates.map(prospect => this.convertToProspect(prospect));
  }

  private buildWhereClause(filters?: ProspectFilters): object {
    if (!filters) return {};

    const where: Record<string, unknown> = {};

    if (filters.firstName) {
      where.firstName = { contains: filters.firstName, mode: 'insensitive' };
    }

    if (filters.lastName) {
      where.lastName = { contains: filters.lastName, mode: 'insensitive' };
    }

    if (filters.position) {
      where.position = { contains: filters.position, mode: 'insensitive' };
    }

    if (filters.college) {
      where.college = { contains: filters.college, mode: 'insensitive' };
    }

    if (filters.homeState) {
      where.homeState = { contains: filters.homeState, mode: 'insensitive' };
    }

    if (filters.drafted !== undefined) {
      where.drafted = filters.drafted;
    }

    if (filters.draftYear !== undefined) {
      where.draftYear = filters.draftYear;
    }

    if (filters.teamId !== undefined) {
      where.teamId = filters.teamId;
    }

    if (filters.minHeight !== undefined || filters.maxHeight !== undefined) {
      where.height = {};
      if (filters.minHeight !== undefined) {
        (where.height as any).gte = filters.minHeight;
      }
      if (filters.maxHeight !== undefined) {
        (where.height as any).lte = filters.maxHeight;
      }
    }

    if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
      where.weight = {};
      if (filters.minWeight !== undefined) {
        (where.weight as any).gte = filters.minWeight;
      }
      if (filters.maxWeight !== undefined) {
        (where.weight as any).lte = filters.maxWeight;
      }
    }

    if (filters.minFortyTime !== undefined || filters.maxFortyTime !== undefined) {
      where.fortyTime = {};
      if (filters.minFortyTime !== undefined) {
        (where.fortyTime as any).gte = filters.minFortyTime;
      }
      if (filters.maxFortyTime !== undefined) {
        (where.fortyTime as any).lte = filters.maxFortyTime;
      }
    }

    if (filters.minVerticalLeap !== undefined || filters.maxVerticalLeap !== undefined) {
      where.verticalLeap = {};
      if (filters.minVerticalLeap !== undefined) {
        (where.verticalLeap as any).gte = filters.minVerticalLeap;
      }
      if (filters.maxVerticalLeap !== undefined) {
        (where.verticalLeap as any).lte = filters.maxVerticalLeap;
      }
    }

    if (filters.minBenchPress !== undefined || filters.maxBenchPress !== undefined) {
      where.benchPress = {};
      if (filters.minBenchPress !== undefined) {
        (where.benchPress as any).gte = filters.minBenchPress;
      }
      if (filters.maxBenchPress !== undefined) {
        (where.benchPress as any).lte = filters.maxBenchPress;
      }
    }

    return where;
  }
}