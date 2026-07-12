import { PositionGroup } from "../value-objects/PositionGroup.vo";

// src/modules/draft-analysis/domain/entities/DraftPickPrediction.entity.ts
export class DraftPickPrediction {
  constructor(
    public readonly teamId: string,
    public readonly round: number,
    public readonly pick: number,
    public readonly year: number,
    public readonly predictedPositions: {
      position: PositionGroup;
      probability: number;
      reasoning: string;
    }[],
    public readonly teamNeed: number, // 0-100 scale
    public readonly historicalTendency: number, // 0-100 scale
    public readonly bestPlayerAvailable: boolean
  ) {}

  getMostLikelyPosition(): PositionGroup {
    return this.predictedPositions.reduce((prev, current) => 
      current.probability > prev.probability ? current : prev
    ).position;
  }

  getConfidenceLevel(): 'High' | 'Medium' | 'Low' {
    const topProbability = this.predictedPositions[0]?.probability ?? 0;
    if (topProbability >= 60) return 'High';
    if (topProbability >= 40) return 'Medium';
    return 'Low';
  }
}