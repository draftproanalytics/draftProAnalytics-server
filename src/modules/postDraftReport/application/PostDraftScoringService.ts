import type {
  DraftPickInput,
  DraftPickReport,
  DraftRoundReport,
  PickScoreBreakdown,
  TeamDraftReport
} from '../domain/PostDraftReport.types';

const MODEL_KEY = 'DPA_POST_DRAFT_REPORT';
const MODEL_VERSION = '2.0.0';

const POSITIONAL_VALUE: Readonly<Record<string, number>> = {
  QB: 100, EDGE: 94, ED: 94, OT: 92, CB: 88, WR: 86, DT: 82,
  S: 76, TE: 74, LB: 72, IOL: 70, OG: 70, C: 70, RB: 62,
  K: 35, P: 30, LS: 25
};

const ROUND_WEIGHTS: Readonly<Record<number, number>> = {
  1: 1.00, 2: 0.90, 3: 0.80, 4: 0.65, 5: 0.55, 6: 0.45, 7: 0.35
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function grade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

export class PostDraftScoringService {
  public generate(teamId: number, teamName: string, draftYear: number, picks: DraftPickInput[]): TeamDraftReport {
    const pickReports = picks.map((pick) => this.scorePick(pick));
    const rounds = this.buildRounds(pickReports);

    const weighted = pickReports.map((pick) => ({
      pick,
      weight: ROUND_WEIGHTS[pick.round] ?? 0.25
    }));
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    const weightedAverage = (selector: (pick: DraftPickReport) => number): number =>
      totalWeight === 0 ? 0 : weighted.reduce((sum, item) => sum + selector(item.pick) * item.weight, 0) / totalWeight;

    const selectionQualityScore = round(weightedAverage((pick) => pick.scoreBreakdown.prospectQuality));
    const draftValueScore = round(weightedAverage((pick) => pick.scoreBreakdown.draftValue));
    const needAlignmentScore = round(weightedAverage((pick) => pick.scoreBreakdown.teamNeedFit));
    const positionalValueScore = round(weightedAverage((pick) => pick.scoreBreakdown.positionalValue));
    const dataConfidence = round(weightedAverage((pick) => pick.dataConfidence));
    const overallScore = round(weightedAverage((pick) => pick.overallScore));

    const strengths = this.teamStrengths(selectionQualityScore, draftValueScore, needAlignmentScore, positionalValueScore);
    const concerns = this.teamConcerns(selectionQualityScore, draftValueScore, needAlignmentScore, positionalValueScore, dataConfidence);

    return {
      teamId,
      teamName,
      draftYear,
      modelKey: MODEL_KEY,
      modelVersion: MODEL_VERSION,
      status: 'PREVIEW',
      generatedAt: new Date().toISOString(),
      overallScore,
      overallGrade: grade(overallScore),
      selectionQualityScore,
      draftValueScore,
      needAlignmentScore,
      positionalValueScore,
      dataConfidence,
      rounds,
      strengths,
      concerns,
      executiveSummary: this.teamSummary(teamName, draftYear, overallScore, strengths, concerns, dataConfidence)
    };
  }

  private scorePick(input: DraftPickInput): DraftPickReport {
    const prospectQuality = this.prospectQuality(input);
    const draftValue = this.draftValue(input);
    const teamNeedFit = this.teamNeedFit(input.teamNeedPriority);
    const positionalValue = POSITIONAL_VALUE[input.position.toUpperCase()] ?? 65;
    const dataConfidence = this.dataConfidence(input);

    const scoreBreakdown: PickScoreBreakdown = {
      prospectQuality,
      draftValue,
      teamNeedFit,
      positionalValue,
      dataConfidence
    };

    const overallScore = round(
      prospectQuality * 0.40 +
      draftValue * 0.27 +
      teamNeedFit * 0.20 +
      positionalValue * 0.13
    );

    const strengths: string[] = [];
    const concerns: string[] = [];
    if (prospectQuality >= 85) strengths.push('high prospect-quality profile');
    if (draftValue >= 80) strengths.push('positive draft-slot value');
    if (teamNeedFit >= 85) strengths.push('addresses a high-priority roster need');
    if (positionalValue >= 88) strengths.push('invests in a premium position');
    if (draftValue < 45) concerns.push('selected materially earlier than the available ranking evidence supports');
    if (teamNeedFit < 45) concerns.push('limited alignment with recorded pre-draft team needs');
    if (dataConfidence < 60) concerns.push('evaluation has limited supporting data');

    return {
      draftPickId: input.draftPickId,
      prospectId: input.metrics.prospectId,
      round: input.round,
      pickNumber: input.pickNumber,
      pickInRound: input.pickInRound,
      playerName: input.playerName,
      position: input.position,
      college: input.college,
      overallScore,
      letterGrade: grade(overallScore),
      scoreBreakdown,
      wrEvaluation: input.metrics.wrEvaluation,
      strengths,
      concerns,
      summary: this.pickSummary(input, overallScore, strengths, concerns, dataConfidence),
      dataConfidence,
      missingSignals: input.metrics.missingSignals
    };
  }

  private prospectQuality(input: DraftPickInput): number {
    const values: Array<{ value: number; weight: number }> = [];
    if (input.position.toUpperCase() === 'WR' && input.metrics.wrEvaluation !== null) {
      values.push({ value: input.metrics.wrEvaluation.score, weight: 0.70 });
    } else if (input.metrics.b4meScore !== null) {
      const normalizedB4Me = input.metrics.b4meScore <= 6
        ? clamp((input.metrics.b4meScore / 4) * 100)
        : clamp(input.metrics.b4meScore);
      values.push({ value: normalizedB4Me, weight: 0.55 });
    }
    if (input.metrics.consensusRank !== null) {
      values.push({ value: clamp(105 - Math.log(input.metrics.consensusRank + 1) * 18), weight: 0.30 });
    }
    if (input.metrics.athleticScore !== null) {
      values.push({ value: input.metrics.athleticScore, weight: 0.15 });
    }
    if (values.length === 0) return 55;
    const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
    return round(values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight);
  }

  private draftValue(input: DraftPickInput): number {
    const rank = input.metrics.consensusRank;
    if (rank === null) return 55;
    const relative = Math.log(input.pickNumber + 1) - Math.log(rank + 1);
    return round(clamp(50 + relative * 38));
  }

  private teamNeedFit(priority: number | null): number {
    if (priority === null) return 35;
    if (priority <= 1) return 100;
    if (priority === 2) return 88;
    if (priority === 3) return 74;
    if (priority === 4) return 58;
    return 45;
  }

  private dataConfidence(input: DraftPickInput): number {
    let score = 30;
    if (input.metrics.b4meScore !== null) score += 30;
    if (input.metrics.consensusRank !== null) score += 20;
    if (input.metrics.athleticScore !== null) score += 10;
    if (input.teamNeedPriority !== null) score += 10;
    if (input.metrics.wrEvaluation !== null) score = Math.max(score, input.metrics.wrEvaluation.dataConfidence);
    return clamp(score);
  }

  private buildRounds(picks: DraftPickReport[]): DraftRoundReport[] {
    const grouped = new Map<number, DraftPickReport[]>();
    for (const pick of picks) grouped.set(pick.round, [...(grouped.get(pick.round) ?? []), pick]);
    return [...grouped.entries()].sort(([a], [b]) => a - b).map(([round, roundPicks]) => {
      const score = roundNumber(average(roundPicks.map((pick) => pick.overallScore)));
      return {
        round,
        score,
        letterGrade: grade(score),
        picks: roundPicks.sort((a, b) => a.pickNumber - b.pickNumber),
        summary: `Round ${round} produced ${roundPicks.length} selection${roundPicks.length === 1 ? '' : 's'} with an average score of ${score.toFixed(1)} (${grade(score)}).`
      };
    });
  }

  private pickSummary(input: DraftPickInput, score: number, strengths: string[], concerns: string[], confidence: number): string {
    const evidence = strengths.length > 0 ? ` Strengths: ${strengths.join(', ')}.` : '';
    const risk = concerns.length > 0 ? ` Concerns: ${concerns.join(', ')}.` : '';
    return `${input.teamName} selected ${input.playerName} (${input.position}) at pick ${input.pickNumber}. The model assigns a ${grade(score)} (${score.toFixed(1)}) with ${confidence.toFixed(0)}% data confidence.${evidence}${risk}`;
  }

  private teamStrengths(selection: number, value: number, need: number, position: number): string[] {
    const strengths: string[] = [];
    if (selection >= 82) strengths.push('strong overall prospect quality');
    if (value >= 78) strengths.push('efficient use of draft slots');
    if (need >= 80) strengths.push('strong alignment with documented roster needs');
    if (position >= 82) strengths.push('appropriate investment in premium positions');
    return strengths;
  }

  private teamConcerns(selection: number, value: number, need: number, position: number, confidence: number): string[] {
    const concerns: string[] = [];
    if (selection < 68) concerns.push('prospect quality trails the target range');
    if (value < 58) concerns.push('multiple selections appear early relative to ranking evidence');
    if (need < 58) concerns.push('the class only partially addresses recorded team needs');
    if (position < 58) concerns.push('draft capital was concentrated in lower-value positions');
    if (confidence < 65) concerns.push('important advanced or consensus data is missing');
    return concerns;
  }

  private teamSummary(teamName: string, draftYear: number, score: number, strengths: string[], concerns: string[], confidence: number): string {
    const strengthText = strengths.length > 0 ? ` Its clearest positives are ${strengths.join(', ')}.` : '';
    const concernText = concerns.length > 0 ? ` The main cautions are ${concerns.join(', ')}.` : '';
    return `${teamName}'s ${draftYear} draft class receives a ${grade(score)} with an overall score of ${score.toFixed(1)} and ${confidence.toFixed(0)}% data confidence.${strengthText}${concernText}`;
  }
}

function roundNumber(value: number): number {
  return Number(value.toFixed(2));
}
