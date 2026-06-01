import type { B4MeScoringMode } from '../enums/B4MeScoringMode';

export type ContactArchetype = 'CONTACT' | 'AVOIDANCE' | 'MIXED' | 'UNKNOWN';
export type CoachabilityTier = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type RfaTier = 'HIGH' | 'MODERATE' | 'LOW';
export type RvaTier = 'STRONG_VALUE' | 'SOLID_VALUE' | 'FIT_DEPENDENT' | 'WEAK_VALUE';
export type CompetitionLevel = 'POWER' | 'GROUP_OF_FIVE' | 'FCS' | 'UNKNOWN';

export interface WrProspectSearchFilters {
  readonly playerName: string | null;
  readonly draftYear: number | null;
  readonly scoringMode: B4MeScoringMode;
  readonly includeMethodology: boolean;
  readonly includeTeamContextPlaceholder: boolean;
  readonly enableCompetitionDiscount: boolean;
  readonly enableInjuryAvailabilityAdjustment: boolean;
  readonly enableQbOffenseContextAdjustment: boolean;
  readonly enableSampleSizeAdjustment: boolean;
  readonly enableArchetypeConfidenceAdjustment: boolean;
  readonly enableCoachabilityAdjustment: boolean;
  readonly enableRfaAdjustment: boolean;
  readonly enableRvaAdjustment: boolean;
}

export interface WrProspectRecord {
  readonly id: number;
  readonly playerName: string;
  readonly school: string | null;
  readonly draftYear: number | null;
  readonly position: string | null;
}

export interface WrSourceMetadataRecord {
  readonly provider: 'CFBD' | 'ESPN' | 'HYBRID_PUBLIC' | string;
  readonly playerSearchName: string;
  readonly resolvedPlayerName: string;
  readonly draftYear: number | null;
  readonly sourcesUsed: string[];
  readonly derivedFields: string[];
  readonly injuryMissedGamesIsConfirmedOnly: boolean;
  readonly notes: string[];
}

export interface WrMetricsRecord {
  readonly prospectId: number;
  readonly yprr: number | null;
  readonly pffOverallGrade: number | null;
  readonly contestedCatchRate: number | null;
  readonly behindLosTargetRate: number | null;
  readonly receptions: number | null;
  readonly targets: number | null;
  readonly missedTacklesForcedPerReception: number | null;
  readonly yacAfterContactPerReception: number | null;
  readonly routesRun: number | null;
  readonly gamesPlayed: number | null;
  readonly gamesMissed: number | null;
  readonly competitionLevel: CompetitionLevel;
  readonly offensiveContextNotes: string | null;
  readonly qbPlayQuality: number | null;
  readonly pffRank: number | null;
  readonly yprrRank: number | null;
  readonly pressManWinRate: number | null;
  readonly releasePackageDepth: number | null;
  readonly routeFamilyDiversity: number | null;
  readonly alignmentFlexibilityIndex: number | null;
  readonly rolePortabilityIndex: number | null;
  readonly usageAdaptabilityIndex: number | null;
  readonly slotRate: number | null;
  readonly wideRate: number | null;
  readonly boundaryRate: number | null;
  readonly sourceMetadataJson: WrSourceMetadataRecord | null;
}

export interface Big4MetricResult {
  readonly key: 'YPRR' | 'PFF_GRADE' | 'CCR' | 'BLOS_RATE';
  readonly label: string;
  readonly threshold: number;
  readonly value: number | null;
  readonly passed: boolean;
}

export interface WrBaseScoreResult {
  readonly metricResults: readonly Big4MetricResult[];
  readonly rawBoxCount: number;
  readonly baseScore: number;
}

export interface WrModifierResult {
  readonly mod1Delta: number;
  readonly mod1Label: string;
  readonly mod2Delta: number;
  readonly mod2Label: string;
  readonly divergenceScore: number | null;
  readonly mod3Delta: number;
  readonly contactArchetype: ContactArchetype;
  readonly keyFlag: string | null;
  readonly explanations: readonly string[];
}

export interface WrCoachabilityResult {
  readonly tier: CoachabilityTier;
  readonly pressManSurvivability: string;
  readonly adjustment: number;
  readonly summary: string;
}

export interface WrRfaResult {
  readonly tier: RfaTier;
  readonly adjustment: number;
  readonly summary: string;
}

export interface WrOptionalFilterResult {
  readonly competitionDelta: number;
  readonly injuryDelta: number;
  readonly qbOffenseDelta: number;
  readonly sampleSizeDelta: number;
  readonly archetypeConfidenceDelta: number;
  readonly explanations: readonly string[];
}

export interface WrRvaResult {
  readonly talent: number;
  readonly fit: number;
  readonly durability: number;
  readonly roleUtility: number;
  readonly costEfficiency: number;
  readonly opportunityCost: number;
  readonly finalRvaScore: number;
  readonly tier: RvaTier;
  readonly summary: string;
  readonly draftValueInterpretation: string;
  readonly opportunityCostSummary: string;
  readonly availabilitySummary: string;
  readonly injuryHistorySummary: string;
  readonly acquisitionCostSummary: string;
  readonly repeatExpenditureRisk: string;
}

export interface WrDecisionTraceEntry {
  readonly stage: string;
  readonly label: string;
  readonly delta: number;
  readonly summary: string;
  readonly details: readonly string[];
}

export interface WrComputedEvaluation {
  readonly rawMetrics: WrMetricsRecord;
  readonly base: WrBaseScoreResult;
  readonly modifiers: WrModifierResult;
  readonly optionalFilters: WrOptionalFilterResult;
  readonly coachability: WrCoachabilityResult;
  readonly rfa: WrRfaResult;
  readonly rva: WrRvaResult;
  readonly decisionTrace: readonly WrDecisionTraceEntry[];
  readonly finalB4MeScore: number;
  readonly scoreExplanation: string;
  readonly projectionNote: string;
}