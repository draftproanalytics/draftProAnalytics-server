export type CompetitionLevel = 'POWER' | 'GROUP_OF_FIVE' | 'FCS' | 'UNKNOWN';

export interface LiveWrProspectSourceMetadata {
  readonly provider: 'CFBD' | 'ESPN' | 'HYBRID_PUBLIC';
  readonly playerSearchName: string;
  readonly resolvedPlayerName: string;
  readonly draftYear: number | null;
  readonly sourcesUsed: string[];
  readonly observedFields: string[];
  readonly derivedFields: string[];
  readonly metricSeasonYear: number | null;
  readonly seasonSelectionPolicy: 'FINAL_COLLEGE_SEASON';
  readonly injuryMissedGamesIsConfirmedOnly: boolean;
  readonly notes: string[];
}

export interface LiveWrProspectPayload {
  readonly playerName: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly school: string | null;
  readonly draftYear: number | null;
  readonly position: 'WR';
  readonly sourceMetadata: LiveWrProspectSourceMetadata;

  readonly metrics: {
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
  };
}