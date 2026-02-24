// src/modules/draft-analysis/infrastructure/repositories/PrismaHistoricalDraftPickRepository.ts
import { PrismaClient } from '@prisma/client';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';
import { HistoricalDraftPickMapper } from '../mappers/HistoricalDraftPickMapper';
import { IHistoricalDraftPickRepository } from '../../domain/repositories/IHistoricalDraftPickRepository';
import { HistoricalDraftPick } from '../../domain/entities/HistoricalDraftPick.entity';
//
export class PrismaHistoricalDraftPickRepository implements IHistoricalDraftPickRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<HistoricalDraftPick | null> {
    const pick = await this.prisma.historicalDraftPicks.findUnique({
      where: { id }
    });

    return pick ? HistoricalDraftPickMapper.toDomain(pick) : null;
  }

  async findByTeamAndYearRange(
    teamId: string,
    startYear: number,
    endYear: number
  ): Promise<HistoricalDraftPick[]> {
    const picks = await this.prisma.historicalDraftPicks.findMany({
      where: {
        teamId: parseInt(teamId),
        year: {
          gte: startYear,
          lte: endYear
        }
      },
      orderBy: [
        { year: 'asc' },
        { round: 'asc' },
        { pick: 'asc' }
      ]
    });

    return HistoricalDraftPickMapper.toManyDomain(picks);
  }

  async findByTeamAndPosition(
    teamId: string,
    position: PositionGroup,
    startYear?: number
  ): Promise<HistoricalDraftPick[]> {
    const picks = await this.prisma.historicalDraftPicks.findMany({
      where: {
        teamId: parseInt(teamId),
        positionGroup: position,
        ...(startYear && { year: { gte: startYear } })
      },
      orderBy: [
        { year: 'desc' },
        { round: 'asc' }
      ]
    });

    return HistoricalDraftPickMapper.toManyDomain(picks);
  }

  async findByTeamAndRound(
    teamId: string,
    round: number,
    startYear?: number
  ): Promise<HistoricalDraftPick[]> {
    const picks = await this.prisma.historicalDraftPicks.findMany({
      where: {
        teamId: parseInt(teamId),
        round,
        ...(startYear && { year: { gte: startYear } })
      },
      orderBy: [
        { year: 'desc' }
      ]
    });

    return HistoricalDraftPickMapper.toManyDomain(picks);
  }

  async save(pick: HistoricalDraftPick): Promise<HistoricalDraftPick> {
    const prismaData = HistoricalDraftPickMapper.toCreateData(pick);
    
    const saved = await this.prisma.historicalDraftPicks.create({
      data: {
        ...prismaData,
        overallPick: this.calculateOverallPick(pick.round, pick.pick),
        college: null,
        gamesPlayed: 0,
        gamesStarted: 0,
        notes: null
      }
    });

    return HistoricalDraftPickMapper.toDomain(saved);
  }

  async saveMany(picks: HistoricalDraftPick[]): Promise<HistoricalDraftPick[]> {
    const prismaData = picks.map(pick => ({
      ...HistoricalDraftPickMapper.toCreateData(pick),
      overallPick: this.calculateOverallPick(pick.round, pick.pick),
      college: null,
      gamesPlayed: 0,
      gamesStarted: 0,
      notes: null
    }));

    await this.prisma.historicalDraftPicks.createMany({
      data: prismaData,
      skipDuplicates: true
    });

    // Fetch the saved picks
    const ids = picks.map(p => p.id);
    const saved = await this.prisma.historicalDraftPicks.findMany({
      where: { id: { in: ids } }
    });

    return HistoricalDraftPickMapper.toManyDomain(saved);
  }

  async update(pick: HistoricalDraftPick): Promise<HistoricalDraftPick> {
    const prismaData = HistoricalDraftPickMapper.toUpdateData(pick);
    
    const updated = await this.prisma.historicalDraftPicks.update({
      where: { id: pick.id },
      data: prismaData
    });

    return HistoricalDraftPickMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.historicalDraftPicks.delete({
      where: { id }
    });
  }

  async findAll(): Promise<HistoricalDraftPick[]> {
    const picks = await this.prisma.historicalDraftPicks.findMany({
      orderBy: [
        { year: 'desc' },
        { round: 'asc' },
        { pick: 'asc' }
      ]
    });

    return HistoricalDraftPickMapper.toManyDomain(picks);
  }

  private calculateOverallPick(round: number, pick: number): number {
    const picksPerRound = 32;
    return ((round - 1) * picksPerRound) + pick;
  }
}