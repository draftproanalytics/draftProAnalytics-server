// src/modules/teamNeedsAnalysis/application/services/TeamNeedsAnalysis.service.ts

import { RosterAnalyzerService, PositionDepthAnalysis } from '../../domain/services/RosterAnalyzer.service';
import { ITeamNeedsAnalysisRepository } from '../../domain/repositories/ITeamNeedsAnalysisRepository';
import { IRosterRepository } from '../../domain/repositories/IRosterRepository';
import { PositionGroup, POSITION_GROUPS } from '../../domain/value-objects/PositionGroup.vo';

import {
  TeamNeedsAnalysisDto,
  AllTeamsNeedsDto,
  TeamNeedsDataTableRow,
  PositionNeedsDataTableRow,
} from '../dto/TeamNeedsAnalysis.dto';
import { TeamNeedsAnalysis } from '../..';
import { PositionNeedScore } from '../../domain/entities/teamNeedsAnalysis.entity';

// Position importance weights (1-10 scale)
const POSITION_IMPORTANCE: Record<string, number> = {
  QB: 10,
  OL: 9,
  C: 9,
  G: 9,
  T: 9,
  DE: 9,
  DT: 8,
  CB: 8,
  WR: 8,
  LB: 7,
  S: 7,
  FS: 7,
  SS: 7,
  TE: 6,
  RB: 5,
  MLB: 7,
  OLB: 7,
  NT: 8,
  DB: 7,
  DL: 8,
  FB: 3,
  K: 2,
  P: 2,
  LS: 1,
};

export class TeamNeedsAnalysisService {
  constructor(
    private readonly analysisRepository: ITeamNeedsAnalysisRepository,
    private readonly rosterRepository: IRosterRepository,
    private readonly rosterAnalyzer: RosterAnalyzerService
  ) {}

  /**
   * Generate team needs analysis for a single team
   */
  async generateTeamNeeds(
    teamId: number,
    seasonYear: number,
    forceRefresh: boolean = false
  ): Promise<TeamNeedsAnalysisDto> {
    // Check if analysis already exists
    if (!forceRefresh) {
      const existing = await this.analysisRepository.findByTeamAndSeason(teamId, seasonYear);
      if (existing) {
        return this.toDto(existing);
      }
    }

    // Get roster data
    const rosterPlayers = await this.rosterRepository.findByTeamId(teamId);

    if (rosterPlayers.length === 0) {
      throw new Error(`No roster data found for team ${teamId}`);
    }

    // Analyze each position
    const allPositions = this.getAllRelevantPositions(rosterPlayers);
    const positionAnalyses = allPositions.map((position) =>
      this.rosterAnalyzer.analyzePositionDepth(position, rosterPlayers)
    );

    // Calculate need scores and priorities
    const positionNeeds = this.calculatePositionNeeds(positionAnalyses);

    // Calculate overall need score
    const overallNeedScore = this.calculateOverallNeedScore(positionNeeds);

    // Determine top priorities
    const topPriorities = this.determineTopPriorities(positionNeeds);

    // Calculate metadata
    const metadata = this.calculateMetadata(rosterPlayers);

    // Create domain entity
    const analysis = TeamNeedsAnalysis.create({
      teamId,
      seasonYear,
      analysisDate: new Date(),
      positionNeeds,
      overallNeedScore,
      topPriorities,
      metadata,
    });

    // Save to repository
    const saved = await this.analysisRepository.save(analysis);

    return this.toDto(saved);
  }

  /**
   * Generate needs analysis for all teams
   */
  async generateAllTeamsNeeds(
    seasonYear: number,
    forceRefresh: boolean = false
  ): Promise<AllTeamsNeedsDto> {
    const teamIds = await this.rosterRepository.getAllTeamIds();

    const teamAnalyses: TeamNeedsAnalysisDto[] = [];

    for (const teamId of teamIds) {
      try {
        const analysis = await this.generateTeamNeeds(teamId, seasonYear, forceRefresh);
        teamAnalyses.push(analysis);
      } catch (error) {
        console.error(`Failed to generate needs for team ${teamId}:`, error);
        // Continue with other teams
      }
    }

    return {
      seasonYear,
      teams: teamAnalyses,
      generatedAt: new Date().toISOString(),
      totalTeams: teamAnalyses.length,
    };
  }

  /**
   * Get team needs analysis
   */
  async getTeamNeeds(teamId: number, seasonYear?: number): Promise<TeamNeedsAnalysisDto | null> {
    let analysis: TeamNeedsAnalysis | null;

    if (seasonYear) {
      analysis = await this.analysisRepository.findByTeamAndSeason(teamId, seasonYear);
    } else {
      analysis = await this.analysisRepository.findLatestByTeam(teamId);
    }

    return analysis ? this.toDto(analysis) : null;
  }

  /**
   * Get all teams needs for a season
   */
  async getAllTeamsNeeds(seasonYear: number): Promise<AllTeamsNeedsDto> {
    const analyses = await this.analysisRepository.findBySeason(seasonYear);

    return {
      seasonYear,
      teams: analyses.map((a) => this.toDto(a)),
      generatedAt: new Date().toISOString(),
      totalTeams: analyses.length,
    };
  }

  /**
   * Get data formatted for DataTable display
   */
  async getTeamsNeedsDataTable(seasonYear: number): Promise<TeamNeedsDataTableRow[]> {
    const analyses = await this.analysisRepository.findBySeason(seasonYear);

    return analyses.map((analysis) => ({
      teamId: analysis.teamId,
      overallNeedScore: analysis.overallNeedScore,
      topNeeds: analysis.topPriorities,
      criticalPositions: analysis.getHighPriorityNeeds(8).length,
      analysisDate: analysis.analysisDate.toISOString(),
    }));
  }

  /**
   * Get position-level needs for all teams (for detailed view)
   */
  async getPositionNeedsDataTable(seasonYear: number): Promise<PositionNeedsDataTableRow[]> {
    const analyses = await this.analysisRepository.findBySeason(seasonYear);

    const rows: PositionNeedsDataTableRow[] = [];

    for (const analysis of analyses) {
      for (const need of analysis.positionNeeds) {
        rows.push({
          teamId: analysis.teamId,
          position: need.position,
          positionGroup: need.positionGroup,
          needScore: need.needScore,
          priority: need.priority,
          reasoning: need.reasoning.join('; '),
        });
      }
    }

    return rows;
  }

  // Private helper methods

  private getAllRelevantPositions(rosterPlayers: any[]): string[] {
    // Get unique positions from roster
    const rosterPositions = [...new Set(rosterPlayers.map((p) => p.position))];

    // Add all standard NFL positions to ensure we analyze even empty positions
    const allPositions = new Set<string>([
      ...rosterPositions,
      'QB',
      'RB',
      'WR',
      'TE',
      'OL',
      'C',
      'G',
      'T',
      'DE',
      'DT',
      'LB',
      'CB',
      'S',
      'K',
      'P',
    ]);

    return Array.from(allPositions);
  }

  private calculatePositionNeeds(analyses: PositionDepthAnalysis[]): PositionNeedScore[] {
    return analyses.map((analysis) => {
      const needScore = this.rosterAnalyzer.calculateNeedScore(analysis);
      const positionImportance = POSITION_IMPORTANCE[analysis.position] || 5;
      const priority = this.rosterAnalyzer.calculatePriority(needScore, positionImportance);

      const reasoning = this.generateReasoning(analysis, needScore);

      return {
        position: analysis.position,
        positionGroup: analysis.positionGroup,
        needScore,
        priority,
        reasoning,
      };
    });
  }

  private generateReasoning(
    analysis: PositionDepthAnalysis,
    needScore: number
  ): string[] {
    const reasons: string[] = [];

    if (analysis.totalPlayers === 0) {
      reasons.push('No players at this position');
    } else if (analysis.totalPlayers === 1) {
      reasons.push('Only one player at position - critical depth issue');
    } else if (analysis.totalPlayers === 2) {
      reasons.push('Limited depth with only two players');
    }

    if (analysis.depthQuality < 40) {
      reasons.push('Very poor depth quality');
    } else if (analysis.depthQuality < 60) {
      reasons.push('Below average depth quality');
    }

    if (analysis.averagePerformance < 50) {
      reasons.push('Poor overall performance grades');
    } else if (analysis.averagePerformance < 60) {
      reasons.push('Below average performance');
    }

    if (analysis.ageingConcern) {
      reasons.push('Aging roster concern - need youth injection');
    }

    if (analysis.contractExpiryConcern) {
      reasons.push('Multiple contracts expiring soon');
    }

    if (analysis.injuryConcern) {
      reasons.push('Current injury concerns at position');
    }

    if (reasons.length === 0) {
      if (needScore < 20) {
        reasons.push('Strong position - no major concerns');
      } else if (needScore < 40) {
        reasons.push('Adequate depth but room for improvement');
      } else {
        reasons.push('Moderate need for upgrade');
      }
    }

    return reasons;
  }

  private calculateOverallNeedScore(needs: PositionNeedScore[]): number {
    if (needs.length === 0) return 0;

    // Weight by position importance
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const need of needs) {
      const importance = POSITION_IMPORTANCE[need.position] || 5;
      totalWeightedScore += need.needScore * importance;
      totalWeight += importance;
    }

    return Math.round(totalWeightedScore / totalWeight);
  }

  private determineTopPriorities(needs: PositionNeedScore[]): string[] {
    // Get positions with priority >= 8 and needScore >= 60
    const criticalNeeds = needs
      .filter((need) => need.priority >= 8 && need.needScore >= 60)
      .sort((a, b) => b.priority - a.priority || b.needScore - a.needScore)
      .slice(0, 5)
      .map((need) => need.position);

    return criticalNeeds;
  }

  private calculateMetadata(rosterPlayers: any[]) {
    const totalAge = rosterPlayers.reduce((sum, p) => sum + (p.age || 0), 0);
    const totalExperience = rosterPlayers.reduce((sum, p) => sum + (p.yearsExperience || 0), 0);
    const injuredCount = rosterPlayers.filter(
      (p) =>
        p.injuryStatus &&
        ['OUT', 'INJURED_RESERVE', 'DOUBTFUL'].includes(p.injuryStatus)
    ).length;

    return {
      rosterSize: rosterPlayers.length,
      averageAge: rosterPlayers.length > 0 ? totalAge / rosterPlayers.length : 0,
      experienceLevel: rosterPlayers.length > 0 ? totalExperience / rosterPlayers.length : 0,
      injuryCount: injuredCount,
    };
  }

  private toDto(analysis: TeamNeedsAnalysis): TeamNeedsAnalysisDto {
    return {
      teamId: analysis.teamId,
      seasonYear: analysis.seasonYear,
      analysisDate: analysis.analysisDate.toISOString(),
      positionNeeds: analysis.positionNeeds,
      overallNeedScore: analysis.overallNeedScore,
      topPriorities: analysis.topPriorities,
      metadata: analysis.metadata,
    };
  }
}