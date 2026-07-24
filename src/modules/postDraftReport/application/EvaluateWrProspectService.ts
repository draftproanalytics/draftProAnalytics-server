import type { WrEvaluationResult, WrMetricSnapshot } from '../domain/PostDraftReport.types';

const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const fixed = (value: number): number => Number(value.toFixed(2));
const normalize = (value: number, floor: number, ceiling: number, inverse = false): number => {
  const raw = clamp(((value - floor) / (ceiling - floor)) * 100);
  return fixed(inverse ? 100 - raw : raw);
};

export class EvaluateWrProspectService {
  public evaluate(input: {
    metrics: WrMetricSnapshot;
    athleticScore: number | null;
    b4meScore: number | null;
    consensusRank: number | null;
  }): WrEvaluationResult {
    const availableMetrics: string[] = [];
    const missingMetrics: string[] = [];
    const strengths: string[] = [];
    const concerns: string[] = [];
    const advanced: number[] = [];

    if (input.metrics.yprr !== null) {
      advanced.push(normalize(input.metrics.yprr, 1, 4));
      availableMetrics.push('yards per route run');
      if (input.metrics.yprr >= 3) strengths.push('high-end receiving efficiency');
      if (input.metrics.yprr < 1.75) concerns.push('below-target route efficiency');
    } else missingMetrics.push('yards per route run');

    if (input.metrics.pffOverallGrade !== null) {
      advanced.push(normalize(input.metrics.pffOverallGrade, 55, 95));
      availableMetrics.push('advanced receiving grade');
    } else missingMetrics.push('advanced receiving grade');

    if (input.metrics.contestedCatchRate !== null) {
      advanced.push(normalize(input.metrics.contestedCatchRate, 20, 70));
      availableMetrics.push('contested-catch rate');
      if (input.metrics.contestedCatchRate >= 50) strengths.push('strong contested-catch conversion');
    } else missingMetrics.push('contested-catch rate');

    if (input.metrics.behindLosTargetRate !== null) {
      advanced.push(normalize(input.metrics.behindLosTargetRate, 5, 35, true));
      availableMetrics.push('behind-LOS target rate');
      if (input.metrics.behindLosTargetRate >= 25) concerns.push('production relied heavily on manufactured touches');
    } else missingMetrics.push('behind-LOS target rate');

    const productionValues: number[] = [];
    const resolvedCatchRate = input.metrics.catchRate ?? (input.metrics.targets !== null && input.metrics.targets > 0 && input.metrics.receptions !== null
      ? (input.metrics.receptions / input.metrics.targets) * 100
      : null);
    if (resolvedCatchRate !== null) {
      productionValues.push(normalize(resolvedCatchRate, 45, 85));
      availableMetrics.push('catch rate');
    } else missingMetrics.push('catch rate');
    if (input.metrics.missedTacklesForcedPerReception !== null) {
      productionValues.push(normalize(input.metrics.missedTacklesForcedPerReception, 0.05, 0.35));
      availableMetrics.push('missed tackles forced per reception');
    } else missingMetrics.push('missed tackles forced per reception');
    if (input.metrics.yacAfterContactPerReception !== null) {
      productionValues.push(normalize(input.metrics.yacAfterContactPerReception, 0.5, 4));
      availableMetrics.push('YAC after contact per reception');
    } else missingMetrics.push('YAC after contact per reception');

    const components = {
      advancedEfficiency: advanced.length ? fixed(advanced.reduce((a, b) => a + b, 0) / advanced.length) : null,
      production: productionValues.length ? fixed(productionValues.reduce((a, b) => a + b, 0) / productionValues.length) : null,
      athleticProfile: input.athleticScore,
      b4me: input.b4meScore === null ? null : clamp(input.b4meScore <= 6 ? (input.b4meScore / 4) * 100 : input.b4meScore),
      ranking: input.consensusRank === null ? null : fixed(clamp(105 - Math.log(input.consensusRank + 1) * 18))
    };

    const weighted: Array<{ score: number; weight: number }> = [];
    if (components.advancedEfficiency !== null) weighted.push({ score: components.advancedEfficiency, weight: 0.30 });
    if (components.production !== null) weighted.push({ score: components.production, weight: 0.20 });
    if (components.athleticProfile !== null) weighted.push({ score: components.athleticProfile, weight: 0.20 });
    if (components.b4me !== null) weighted.push({ score: components.b4me, weight: 0.20 });
    if (components.ranking !== null) weighted.push({ score: components.ranking, weight: 0.10 });

    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    const score = totalWeight === 0 ? 55 : fixed(weighted.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight);
    const confidence = fixed(clamp((totalWeight / 1.0) * 100));
    const tier = score >= 85 ? 'ELITE' : score >= 75 ? 'STRONG' : score >= 65 ? 'STARTER_TRAITS' : score >= 50 ? 'DEVELOPMENTAL' : 'HIGH_RISK';

    return { score, tier, dataConfidence: confidence, componentScores: components, availableMetrics, missingMetrics, strengths, concerns };
  }
}
