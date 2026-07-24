export interface WrMetricSnapshot {
  yprr: number | null;
  pffOverallGrade: number | null;
  contestedCatchRate: number | null;
  behindLosTargetRate: number | null;
  catchRate: number | null;
  receptions: number | null;
  targets: number | null;
  missedTacklesForcedPerReception: number | null;
  yacAfterContactPerReception: number | null;
  routesRun: number | null;
  gamesPlayed: number | null;
  sourceMetadata: unknown | null;
  provenance: unknown | null;
  resolvedRecordIds: string[];
}

export interface WrEvaluationResult {
  score: number;
  tier: 'ELITE' | 'STRONG' | 'STARTER_TRAITS' | 'DEVELOPMENTAL' | 'HIGH_RISK';
  dataConfidence: number;
  componentScores: {
    advancedEfficiency: number | null;
    production: number | null;
    athleticProfile: number | null;
    b4me: number | null;
    ranking: number | null;
  };
  availableMetrics: string[];
  missingMetrics: string[];
  strengths: string[];
  concerns: string[];
}

export interface ProspectMetricSnapshot {
  prospectId: number | null;
  playerName: string;
  position: string;
  college: string | null;
  b4meScore: number | null;
  consensusRank: number | null;
  rankingSourceCount: number;
  athleticScore: number | null;
  wrMetrics: WrMetricSnapshot | null;
  wrEvaluation: WrEvaluationResult | null;
  availableSignals: string[];
  missingSignals: string[];
}

export interface DraftPickInput {
  draftPickId: number;
  teamId: number;
  teamName: string;
  draftYear: number;
  round: number;
  pickNumber: number;
  pickInRound: number;
  playerName: string;
  position: string;
  college: string | null;
  teamNeedPriority: number | null;
  metrics: ProspectMetricSnapshot;
}

export interface PickScoreBreakdown {
  prospectQuality: number;
  draftValue: number;
  teamNeedFit: number;
  positionalValue: number;
  dataConfidence: number;
}

export interface DraftPickReport {
  draftPickId: number;
  prospectId: number | null;
  round: number;
  pickNumber: number;
  pickInRound: number;
  playerName: string;
  position: string;
  college: string | null;
  overallScore: number;
  letterGrade: string;
  scoreBreakdown: PickScoreBreakdown;
  wrEvaluation: WrEvaluationResult | null;
  strengths: string[];
  concerns: string[];
  summary: string;
  dataConfidence: number;
  missingSignals: string[];
}

export interface DraftRoundReport {
  round: number;
  score: number;
  letterGrade: string;
  picks: DraftPickReport[];
  summary: string;
}

export interface TeamDraftReport {
  reportId?: string;
  reportVersion?: number;
  status: 'PREVIEW' | 'FINALIZED';
  teamId: number;
  teamName: string;
  draftYear: number;
  modelKey: string;
  modelVersion: string;
  generatedAt: string;
  finalizedAt?: string;
  inputHash?: string;
  overallScore: number;
  overallGrade: string;
  selectionQualityScore: number;
  draftValueScore: number;
  needAlignmentScore: number;
  positionalValueScore: number;
  dataConfidence: number;
  rounds: DraftRoundReport[];
  strengths: string[];
  concerns: string[];
  executiveSummary: string;
}

export interface EvaluationModelSnapshot {
  id: string;
  modelKey: string;
  modelVersion: string;
  positionGroup: string;
  weights: Record<string, number>;
  thresholds: Record<string, number>;
}

export interface PostDraftInputSnapshot {
  teamId: number;
  draftYear: number;
  capturedAt: string;
  model: EvaluationModelSnapshot;
  picks: DraftPickInput[];
}
