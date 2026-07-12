// src/modules/draft-analysis/domain/services/TeamNeedsCalculator.service.ts
import { ITeamRosterRepository, PositionalDepth } from '../repositories/ITeamRosterRepository';
import { PositionGroup } from '../value-objects/PositionGroup.vo';

export interface TeamNeed {
  position: PositionGroup;
  severity: number; // 0-100
  starterQuality: number; // 0-100
  depthQuality: number; // 0-100
  averageAge: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

export class TeamNeedsCalculatorService {
  constructor(
    private readonly rosterRepository: ITeamRosterRepository
  ) {}

  async calculateTeamNeeds(teamId: string): Promise<TeamNeed[]> {
    const allDepths = await this.rosterRepository.getAllPositionalDepths(teamId);
    
    const needs: TeamNeed[] = allDepths.map(depth => {
      const severity = this.calculateNeedSeverity(depth);
      const starterQuality = this.calculateStarterQuality(depth);
      const depthQuality = this.calculateDepthQuality(depth);
      const priority = this.determinePriority(severity);

      return {
        position: depth.position,
        severity,
        starterQuality,
        depthQuality,
        averageAge: depth.averageAge,
        priority
      };
    });

    return needs.sort((a, b) => b.severity - a.severity);
  }

  private calculateNeedSeverity(depth: PositionalDepth): number {
    let severity = 0;

    // Factor 1: Starter quality (40% weight)
    const starterQuality = depth.starters.reduce((sum, s) => sum + s.performanceGrade, 0) / 
                          (depth.starters.length || 1);
    severity += (100 - starterQuality) * 0.4;

    // Factor 2: Depth quality (30% weight)
    const depthCount = depth.backups.length;
    const depthQuality = depth.backups.reduce((sum, b) => sum + b.performanceGrade, 0) / 
                        (depthCount || 1);
    severity += (100 - depthQuality) * 0.3;

    // Factor 3: Age concerns (20% weight)
    if (depth.averageAge >= 30) {
      severity += 20;
    } else if (depth.averageAge >= 28) {
      severity += 10;
    }

    // Factor 4: Lack of depth (10% weight)
    if (depthCount === 0) {
      severity += 10;
    } else if (depthCount === 1) {
      severity += 5;
    }

    return Math.min(100, Math.max(0, severity));
  }

  private calculateStarterQuality(depth: PositionalDepth): number {
    if (depth.starters.length === 0) return 0;
    
    return depth.starters.reduce((sum, s) => sum + s.performanceGrade, 0) / 
           depth.starters.length;
  }

  private calculateDepthQuality(depth: PositionalDepth): number {
    if (depth.backups.length === 0) return 0;
    
    return depth.backups.reduce((sum, b) => sum + b.performanceGrade, 0) / 
           depth.backups.length;
  }

  private determinePriority(severity: number): TeamNeed['priority'] {
    if (severity >= 80) return 'Critical';
    if (severity >= 60) return 'High';
    if (severity >= 40) return 'Medium';
    return 'Low';
  }
}