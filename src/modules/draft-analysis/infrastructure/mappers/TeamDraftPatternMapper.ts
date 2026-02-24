// src/modules/draft-analysis/infrastructure/mappers/TeamDraftPatternMapper.ts
import { TeamDraftPattern } from '../../domain/entities/TeamDraftPattern.entity';
import { PositionGroup, PositionGroupMetrics } from '../../domain/value-objects/PositionGroup.vo';

interface PrismaTeamDraftPattern {
  id: string;
  teamId: number;
  regimeStartYear: number;
  regimeEndYear: number | null;
  generalManager: string;
  headCoach: string;
  totalPicks: number;
  successfulPicks: number;
  overallSuccessRate: number;
  lastAnalyzedAt: Date;
  positionMetrics: Array<{
    id: string;
    patternId: string;
    position: string;
    totalPicks: number;
    successfulPicks: number;
    successRate: number;
    averageRound: number;
    preferredRounds: string;
    competencyLevel: string;
    systemFitBias: boolean;
    recentDrafts: number;
  }>;
}

export class TeamDraftPatternMapper {
  static toDomain(prisma: PrismaTeamDraftPattern): TeamDraftPattern {
    const positionMetricsMap = new Map<PositionGroup, PositionGroupMetrics>();

    for (const metric of prisma.positionMetrics) {
      const preferredRounds: number[] = JSON.parse(metric.preferredRounds);
      
      positionMetricsMap.set(
        metric.position as PositionGroup,
        new PositionGroupMetrics(
          metric.position as PositionGroup,
          metric.totalPicks,
          metric.successfulPicks,
          metric.averageRound,
          preferredRounds,
          metric.systemFitBias
        )
      );
    }

    return new TeamDraftPattern(
      String(prisma.teamId), // Convert number to string for domain
      prisma.regimeStartYear,
      prisma.regimeEndYear,
      prisma.generalManager,
      prisma.headCoach,
      positionMetricsMap
    );
  }

  // For CREATE - exclude id, createdAt, updatedAt
  static toCreateData(domain: TeamDraftPattern) {
    const allMetrics = domain.getAllMetrics();
    const totalPicks = allMetrics.reduce((sum, m) => sum + m.totalPicks, 0);
    const successfulPicks = allMetrics.reduce((sum, m) => sum + m.successfulPicks, 0);
    const overallSuccessRate = totalPicks > 0 ? (successfulPicks / totalPicks) * 100 : 0;

    return {
      teamId: parseInt(domain.teamId),
      regimeStartYear: domain.regimeStartYear,
      regimeEndYear: domain.regimeEndYear,
      generalManager: domain.generalManager,
      headCoach: domain.headCoach,
      totalPicks,
      successfulPicks,
      overallSuccessRate,
      lastAnalyzedAt: new Date()
    };
  }

  // For UPDATE - exclude id, createdAt, updatedAt
  static toUpdateData(domain: TeamDraftPattern) {
    const allMetrics = domain.getAllMetrics();
    const totalPicks = allMetrics.reduce((sum, m) => sum + m.totalPicks, 0);
    const successfulPicks = allMetrics.reduce((sum, m) => sum + m.successfulPicks, 0);
    const overallSuccessRate = totalPicks > 0 ? (successfulPicks / totalPicks) * 100 : 0;

    return {
      teamId: parseInt(domain.teamId),
      regimeStartYear: domain.regimeStartYear,
      regimeEndYear: domain.regimeEndYear,
      generalManager: domain.generalManager,
      headCoach: domain.headCoach,
      totalPicks,
      successfulPicks,
      overallSuccessRate,
      lastAnalyzedAt: new Date()
    };
  }

  // For position metrics CREATE - exclude id, createdAt, updatedAt
  static toMetricsCreateData(domain: TeamDraftPattern, patternId: string) {
    const allMetrics = domain.getAllMetrics();

    return allMetrics.map(metric => ({
      patternId,
      position: metric.group,
      totalPicks: metric.totalPicks,
      successfulPicks: metric.successfulPicks,
      successRate: metric.successRate,
      averageRound: metric.averageRound,
      preferredRounds: JSON.stringify(metric.preferredRounds),
      competencyLevel: metric.draftCompetency,
      systemFitBias: metric.systemFitBias,
      recentDrafts: 0
    }));
  }
}