// src/modules/draft-analysis/application/dto/TeamNeed.dto.ts
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

export interface TeamNeedDto {
  position: PositionGroup;
  severity: number;
  starterQuality: number;
  depthQuality: number;
  averageAge: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface TeamNeedsResponseDto {
  teamId: string;
  needs: TeamNeedDto[];
  criticalNeeds: PositionGroup[];
  updatedAt: Date;
}