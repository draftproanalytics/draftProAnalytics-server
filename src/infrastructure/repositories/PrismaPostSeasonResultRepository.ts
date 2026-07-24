// src/infrastructure/repositories/PrismaPostSeasonResultRepository.ts
import { IPostSeasonResultRepository, PostSeasonResultFilters } from '@/domain/postSeasonResult/repositories/IPostSeasonResultRepository';
import { PostSeasonResult } from '@/domain/postSeasonResult/entities/PostSeasonResult';
import { PaginationParams, PaginatedResponse } from '@/shared/types/common';
import { NotFoundError } from '@/shared/errors/AppError';
import { prisma } from '../database/prisma';
import type { Prisma } from '@prisma/client';

type PostSeasonResultWithTeam = Prisma.PostSeasonResultGetPayload<{ include: { Team: true } }>;

export class PrismaPostSeasonResultRepository implements IPostSeasonResultRepository {
  
  async save(postSeasonResult: PostSeasonResult): Promise<PostSeasonResult> {
    const data = postSeasonResult.toPersistence();
    const { id, ...createData } = data;

    const savedPostSeasonResult = await prisma.postSeasonResult.create({
      data: createData,
      include: {
        Team: true, // ✅ Simple include - Prisma will return ALL Team fields from your schema
      },
    });

    return PostSeasonResult.fromPersistence(savedPostSeasonResult);
  }

  async findById(id: number): Promise<PostSeasonResult | null> {
    const postSeasonResult = await prisma.postSeasonResult.findUnique({
      where: { id },
      include: {
        Team: true, // ✅ Simple include - gets all your Team fields
      },
    });

    return postSeasonResult ? PostSeasonResult.fromPersistence(postSeasonResult) : null;
  }

  async findAll(
    filters?: PostSeasonResultFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<PostSeasonResult>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);

    const [postSeasonResults, total] = await Promise.all([
      prisma.postSeasonResult.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { playoffYear: 'desc' },
          { id: 'asc' }
        ],
        include: {
          Team: true, // ✅ Simple include
        },
      }),
      prisma.postSeasonResult.count({ where }),
    ]);

    return {
      data: await Promise.all(postSeasonResults.map((postSeasonResult) => this.toDomainWithGameId(postSeasonResult))),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: number, postSeasonResult: PostSeasonResult): Promise<PostSeasonResult> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new NotFoundError('PostSeasonResult', id);
    }

    const data = postSeasonResult.toPersistence();
    const { id: _, ...updateData } = data;

    const updatedPostSeasonResult = await prisma.postSeasonResult.update({
      where: { id },
      data: updateData,
      include: {
        Team: true, // ✅ Simple include
      },
    });

    return PostSeasonResult.fromPersistence(updatedPostSeasonResult);
  }

  async delete(id: number): Promise<void> {
    const exists = await this.exists(id);
    if (!exists) {
      throw new NotFoundError('PostSeasonResult', id);
    }

    await prisma.postSeasonResult.delete({
      where: { id },
    });
  }

  async exists(id: number): Promise<boolean> {
    const count = await prisma.postSeasonResult.count({
      where: { id },
    });
    return count > 0;
  }

  // Domain-specific implementations
  async findByTeamId(teamId: number): Promise<PostSeasonResult[]> {
    const postSeasonResults = await prisma.postSeasonResult.findMany({
      where: { teamId },
      orderBy: { playoffYear: 'desc' },
      include: {
        Team: true, // ✅ Simple include
      },
    });

    return postSeasonResults.map((result) => PostSeasonResult.fromPersistence(result));
  }

  async findByPlayoffYear(playoffYear: number): Promise<PostSeasonResult[]> {
    const postSeasonResults = await prisma.postSeasonResult.findMany({
      where: { playoffYear },
      orderBy: { teamId: 'asc' },
      include: {
        Team: true, // ✅ Simple include
      },
    });

    return postSeasonResults.map((result) => PostSeasonResult.fromPersistence(result));
  }

  async findByTeamAndYear(teamId: number, playoffYear: number): Promise<PostSeasonResult | null> {
    const postSeasonResult = await prisma.postSeasonResult.findFirst({
      where: {
        teamId,
        playoffYear,
      },
      include: {
        Team: true, // ✅ Simple include
      },
    });

    return postSeasonResult ? PostSeasonResult.fromPersistence(postSeasonResult) : null;
  }

  async getTeamPlayoffHistory(teamId: number): Promise<PostSeasonResult[]> {
    const postSeasonResults = await prisma.postSeasonResult.findMany({
      where: { teamId },
      orderBy: { playoffYear: 'desc' },
      include: {
        Team: true, // ✅ Simple include
      },
    });

    return postSeasonResults.map((result) => PostSeasonResult.fromPersistence(result));
  }

  async getWinsByTeam(teamId: number): Promise<PostSeasonResult[]> {
    const postSeasonResults = await prisma.postSeasonResult.findMany({
      where: {
        teamId,
        winLose: 'W',
      },
      orderBy: { playoffYear: 'desc' },
      include: {
        Team: true, // ✅ Simple include
      },
    });

    return postSeasonResults.map((result) => PostSeasonResult.fromPersistence(result));
  }

  async getLossesByTeam(teamId: number): Promise<PostSeasonResult[]> {
    const postSeasonResults = await prisma.postSeasonResult.findMany({
      where: {
        teamId,
        winLose: 'L',
      },
      orderBy: { playoffYear: 'desc' },
      include: {
        Team: true, // ✅ Simple include
      },
    });

    return postSeasonResults.map((result) => PostSeasonResult.fromPersistence(result));
  }

  private async toDomainWithGameId(record: PostSeasonResultWithTeam): Promise<PostSeasonResult> {
    const gameId = await this.findMatchingGameId(record);
    return PostSeasonResult.fromPersistence({ ...record, gameId });
  }

  private async findMatchingGameId(record: PostSeasonResultWithTeam): Promise<number | undefined> {
    if (record.playoffYear === null || record.teamId === null || record.teamScore === null || record.opponentScore === null) {
      return undefined;
    }

    const game = await prisma.game.findFirst({
      where: {
        seasonYear: String(record.playoffYear),
        seasonType: 3,
        OR: [
          {
            homeTeamId: record.teamId,
            homeScore: record.teamScore,
            awayScore: record.opponentScore,
          },
          {
            awayTeamId: record.teamId,
            awayScore: record.teamScore,
            homeScore: record.opponentScore,
          },
        ],
      },
      orderBy: [{ gameDate: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });

    return game?.id;
  }

  private buildWhereClause(filters?: PostSeasonResultFilters): object {
    if (!filters) return {};

    const where: Record<string, unknown> = {};

    if (filters.teamId) {
      where.teamId = filters.teamId;
    }

    if (filters.playoffYear) {
      where.playoffYear = filters.playoffYear;
    }

    if (filters.lastRoundReached) {
      where.lastRoundReached = { contains: filters.lastRoundReached, mode: 'insensitive' };
    }

    if (filters.winLose) {
      where.winLose = filters.winLose.toUpperCase();
    }

    return where;
  }
}