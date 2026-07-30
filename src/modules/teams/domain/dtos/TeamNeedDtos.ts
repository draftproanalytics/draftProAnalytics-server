export type TeamNeedSource = 'MANUAL' | 'GENERATED' | 'IMPORTED'
export type TeamNeedStatus = 'RECOMMENDED' | 'APPROVED' | 'REJECTED' | 'OVERRIDDEN'

export interface TeamNeedDto {
  id: number;
  teamId: number;
  position: string;
  priority: number;
  draftYear: number;
  needScore: number | null;
  source: TeamNeedSource;
  status: TeamNeedStatus;
  asOfDate: string | null;
  algorithmVersion: string | null;
  rationaleJson: unknown;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TeamNeedSuggestionDto {
  position: string;
  priority: number;
  draftYear: number;
  reasons: string[];
  rosterCount: number;
  avgAge: number | null;
  expiringCount: number;
}

export interface TeamNeedsPageDto {
  teamId: number;
  evaluationYear: number;
  draftYear: number;
  persistedNeeds: TeamNeedDto[];
  suggestions: TeamNeedSuggestionDto[];
}
