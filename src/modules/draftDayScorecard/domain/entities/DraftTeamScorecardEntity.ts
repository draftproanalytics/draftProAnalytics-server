import { Prisma } from '@prisma/client';

export interface DraftTeamScorecardEntity {
  id: number;
  draftEventId: number;
  teamId: number;
  preDraftNeeds: Prisma.JsonValue | null;
  strategyNotes: string | null;
  totalPicks: number;
  pickedCount: number;
  overallGrade: string | null;
  valueGrade: string | null;
  needsFitGrade: string | null;
  analystSummary: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}