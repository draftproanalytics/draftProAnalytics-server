import { PositionGroup, PositionGroupMetrics } from "../value-objects/PositionGroup.vo";

// src/modules/draft-analysis/domain/entities/TeamDraftPattern.entity.ts
export class TeamDraftPattern {
  constructor(
    public readonly teamId: string,
    public readonly regimeStartYear: number, // e.g., 2017 for Andy Reid era
    public readonly regimeEndYear: number | null,
    public readonly generalManager: string,
    public readonly headCoach: string,
    private positionMetrics: Map<PositionGroup, PositionGroupMetrics>
  ) {}

  getMetricsForPosition(position: PositionGroup): PositionGroupMetrics | undefined {
    return this.positionMetrics.get(position);
  }

  getAllMetrics(): PositionGroupMetrics[] {
    return Array.from(this.positionMetrics.values());
  }

  getBestDraftingPositions(): PositionGroup[] {
    return Array.from(this.positionMetrics.entries())
      .filter(([_, metrics]) => metrics.successRate >= 40)
      .sort((a, b) => b[1].successRate - a[1].successRate)
      .map(([position, _]) => position);
  }

  getWorstDraftingPositions(): PositionGroup[] {
    return Array.from(this.positionMetrics.entries())
      .filter(([_, metrics]) => metrics.successRate < 25)
      .sort((a, b) => a[1].successRate - b[1].successRate)
      .map(([position, _]) => position);
  }

  hasSystemBias(position: PositionGroup): boolean {
    return this.positionMetrics.get(position)?.systemFitBias ?? false;
  }
}