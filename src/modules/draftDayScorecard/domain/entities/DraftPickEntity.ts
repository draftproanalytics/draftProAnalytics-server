import { DraftPick_status } from '@prisma/client';

export interface DraftPickEntity {
  id: number;
  round: number;
  pickNumber: number;
  pickInRound: number;
  draftYear: number;
  draftEventId: number;
  currentTeamId: number;
  originalTeam: number | null;
  prospectId: number | null;
  playerId: number | null;
  playerFirstName: string | null;
  playerLastName: string | null;
  position: string | null;
  college: string | null;
  used: boolean;
  status: DraftPick_status;
  isCompensatory: boolean;
  acquiredViaTrade: boolean;
  selectedAt: Date | null;
  pickGrade: string | null;
  valueGrade: string | null;
  needsFitGrade: string | null;
  analystNotes: string | null;
  tradeNotes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}