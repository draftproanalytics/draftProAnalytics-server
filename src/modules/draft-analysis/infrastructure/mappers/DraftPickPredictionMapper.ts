// src/modules/draft-analysis/infrastructure/mappers/DraftPickPredictionMapper.ts
import { DraftPickPrediction } from '../../domain/entities/DraftPickPrediction.entity';
import { PositionGroup } from '../../domain/value-objects/PositionGroup.vo';

interface PrismaDraftPrediction {
  id: string;
  teamId: number;
  year: number;
  round: number;
  pick: number;
  predictedPosition: string;
  probability: number;
  reasoning: string;
  teamNeedScore: number;
  historicalTendencyScore: number;
  confidenceLevel: string;
  createdAt: Date;
}

export class DraftPickPredictionMapper {
  static toDomain(
    prisma: PrismaDraftPrediction,
    allPredictions: PrismaDraftPrediction[]
  ): DraftPickPrediction {
    // Group predictions for the same pick
    const relatedPredictions = allPredictions.filter(
      p => p.teamId === prisma.teamId && 
           p.year === prisma.year && 
           p.round === prisma.round && 
           p.pick === prisma.pick
    );

    const predictedPositions = relatedPredictions.map(p => ({
      position: p.predictedPosition as PositionGroup,
      probability: p.probability,
      reasoning: p.reasoning
    })).sort((a, b) => b.probability - a.probability);

    return new DraftPickPrediction(
      String(prisma.teamId), // Convert number to string for domain
      prisma.round,
      prisma.pick,
      prisma.year,
      predictedPositions,
      prisma.teamNeedScore,
      prisma.historicalTendencyScore,
      prisma.historicalTendencyScore > 60
    );
  }

  // For CREATE - exclude id, createdAt (auto-generated)
  static toCreateData(
    domain: DraftPickPrediction,
    positionIndex: number = 0
  ) {
    const prediction = domain.predictedPositions[positionIndex];

    return {
      teamId: parseInt(domain.teamId),
      year: domain.year,
      round: domain.round,
      pick: domain.pick,
      predictedPosition: prediction.position,
      probability: prediction.probability,
      reasoning: prediction.reasoning,
      teamNeedScore: domain.teamNeed,
      historicalTendencyScore: domain.historicalTendency,
      confidenceLevel: domain.getConfidenceLevel()
    };
  }

  // For creating multiple predictions at once
  static toCreateManyData(domain: DraftPickPrediction) {
    return domain.predictedPositions.map((_, index) => this.toCreateData(domain, index));
  }
}