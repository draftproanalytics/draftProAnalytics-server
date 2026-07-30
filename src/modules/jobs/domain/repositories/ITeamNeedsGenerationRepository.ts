import type { Prisma } from '@prisma/client';

export interface TeamNeedsGenerationRosterPlayer {
  readonly position: string;
  readonly positionGroup: string;
  readonly depthChartOrder: number;
  readonly age: number;
  readonly yearsExperience: number;
  readonly performanceGrade: number;
  readonly isStarter: boolean;
  readonly contractYearsRemaining: number;
  readonly injuryStatus?: string;
}


export interface TeamNeedsTalentInput {
  readonly position: string;
  readonly assessmentId?: string;
  readonly rosterCountScore?: number;
  readonly topStarterScore?: number;
  readonly secondStarterScore?: number;
  readonly depthQualityScore?: number;
  readonly productionScore?: number;
  readonly assignmentGradeScore?: number;
  readonly roleCompletenessScore?: number;
  readonly contextRiskScore?: number;
  readonly dataConfidence?: number;
  readonly finalNeedScore?: number;
  readonly priority?: number;
  readonly reason?: string;
  readonly contextCount: number;
}

export interface GeneratedTeamNeedRecord {
  readonly teamId: number;
  readonly draftYear: number;
  readonly position: string;
  readonly priority: number;
  readonly needScore: number;
  readonly asOfDate: Date;
  readonly algorithmVersion: string;
  readonly rationaleJson: Prisma.InputJsonValue;
  readonly inputSnapshotJson: Prisma.InputJsonValue;
  readonly generatedByJobId: number;
}

export interface PersistGeneratedTeamNeedsResult {
  readonly created: number;
  readonly updated: number;
  readonly preserved: number;
  readonly removed: number;
}

export interface ITeamNeedsGenerationRepository {
  listTeamIds(teamId?: number): Promise<readonly number[]>;
  loadRoster(teamId: number): Promise<readonly TeamNeedsGenerationRosterPlayer[]>;
  loadTalentInputs(teamId: number, draftYear: number): Promise<readonly TeamNeedsTalentInput[]>;
  persistRecommendations(
    teamId: number,
    draftYear: number,
    records: readonly GeneratedTeamNeedRecord[],
    replaceRecommendations: boolean,
  ): Promise<PersistGeneratedTeamNeedsResult>;
}
