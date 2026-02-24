// src/modules/draft-analysis/infrastructure/repositories/PrismaTeamDraftPatternRepository.ts
import { PrismaClient } from '@prisma/client';
import { ITeamDraftPatternRepository } from '../../domain/repositories/ITeamDraftPatternRepository';
import { TeamDraftPattern } from '../../domain/entities/TeamDraftPattern.entity';
import { TeamDraftPatternMapper } from '../mappers/TeamDraftPatternMapper';

export class PrismaTeamDraftPatternRepository implements ITeamDraftPatternRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTeamId(teamId: string): Promise<TeamDraftPattern | null> {
    const pattern = await this.prisma.teamDraftPatterns.findUnique({
      where: { teamId: parseInt(teamId) },
      include: {
        positionGroupMetrics: true  // Changed from positionMetrics
      }
    });

    return pattern ? TeamDraftPatternMapper.toDomain(this.normalize(pattern)) : null;
  }

  async findByGeneralManager(generalManager: string): Promise<TeamDraftPattern[]> {
    const patterns = await this.prisma.teamDraftPatterns.findMany({
      where: { generalManager },
      include: {
        positionGroupMetrics: true  // Changed from positionMetrics
      }
    });

    return patterns.map(p => TeamDraftPatternMapper.toDomain(this.normalize(p)));
  }

  async findByHeadCoach(headCoach: string): Promise<TeamDraftPattern[]> {
    const patterns = await this.prisma.teamDraftPatterns.findMany({
      where: { headCoach },
      include: {
        positionGroupMetrics: true  // Changed from positionMetrics
      }
    });

    return patterns.map(p => TeamDraftPatternMapper.toDomain(this.normalize(p)));
  }

  async findByRegime(
    generalManager: string,
    headCoach: string
  ): Promise<TeamDraftPattern | null> {
    const pattern = await this.prisma.teamDraftPatterns.findFirst({
      where: {
        generalManager,
        headCoach
      },
      include: {
        positionGroupMetrics: true  // Changed from positionMetrics
      }
    });

    return pattern ? TeamDraftPatternMapper.toDomain(this.normalize(pattern)) : null;
  }

  async save(pattern: TeamDraftPattern): Promise<TeamDraftPattern> {
    const patternData = TeamDraftPatternMapper.toCreateData(pattern);

    const saved = await this.prisma.teamDraftPatterns.create({
      data: patternData
    });

    // Save position metrics
    const metricsData = TeamDraftPatternMapper.toMetricsCreateData(pattern, saved.id);
    
    await this.prisma.positionGroupMetrics.createMany({
      data: metricsData
    });

    // Fetch complete pattern with metrics
    const complete = await this.prisma.teamDraftPatterns.findUnique({
      where: { id: saved.id },
      include: {
        positionGroupMetrics: true  // Changed from positionMetrics
      }
    });

    return TeamDraftPatternMapper.toDomain(this.normalize(complete!));
  }

  async update(pattern: TeamDraftPattern): Promise<TeamDraftPattern> {
    const patternData = TeamDraftPatternMapper.toUpdateData(pattern);

    // Update main pattern
    const updated = await this.prisma.teamDraftPatterns.update({
      where: { teamId: parseInt(pattern.teamId) },
      data: patternData
    });

    // Delete old metrics
    await this.prisma.positionGroupMetrics.deleteMany({
      where: { patternId: updated.id }
    });

    // Insert new metrics
    const metricsData = TeamDraftPatternMapper.toMetricsCreateData(pattern, updated.id);
    await this.prisma.positionGroupMetrics.createMany({
      data: metricsData
    });

    // Fetch complete pattern
    const complete = await this.prisma.teamDraftPatterns.findUnique({
      where: { id: updated.id },
      include: {
        positionGroupMetrics: true  // Changed from positionMetrics
      }
    });

    return TeamDraftPatternMapper.toDomain(this.normalize(complete!));
  }

  async delete(teamId: string): Promise<void> {
    await this.prisma.teamDraftPatterns.delete({
      where: { teamId: parseInt(teamId) }
    });
  }

  async findAll(): Promise<TeamDraftPattern[]> {
    const patterns = await this.prisma.teamDraftPatterns.findMany({
      include: {
        positionGroupMetrics: true  // Changed from positionMetrics
      }
    });

    return patterns.map(p => TeamDraftPatternMapper.toDomain(this.normalize(p)));
  }

  /**
   * Normalize Prisma result to match mapper expectations
   * - Rename positionGroupMetrics to positionMetrics
   * - Convert Decimal to number
   */
  private normalize(prismaPattern: any) {
    return {
      ...prismaPattern,
      overallSuccessRate: Number(prismaPattern.overallSuccessRate), // Convert Decimal to number
      totalPicks: Number(prismaPattern.totalPicks),
      successfulPicks: Number(prismaPattern.successfulPicks),
      positionMetrics: prismaPattern.positionGroupMetrics.map((metric: any) => ({
        ...metric,
        successRate: Number(metric.successRate),
        averageRound: Number(metric.averageRound)
      }))
    };
  }
}