import {
  DraftEvent_status,
  DraftPick_status,
  Prisma,
} from '@prisma/client';

export interface CreateDraftEventRequestDto {
  draftYear: number;
  name?: string;
  league?: string;
  startsAt?: string | null;
  status?: DraftEvent_status;
}

export interface DraftEventResponseDto {
  id: number;
  draftYear: number;
  name: string;
  league: string;
  startsAt: string | null;
  status: DraftEvent_status;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SeedDraftPickRequestDto {
  round: number;
  pickNumber: number;
  pickInRound?: number;
  currentTeamId: number;
  originalTeam?: number | null;
  isCompensatory?: boolean;
  acquiredViaTrade?: boolean;
  tradeNotes?: string | null;
}

export interface SeedDraftPicksRequestDto {
  picks: SeedDraftPickRequestDto[];
}

export interface UpdateDraftPickRequestDto {
  currentTeamId?: number;
  originalTeam?: number | null;
  prospectId?: number | null;
  playerId?: number | null;
  playerFirstName?: string | null;
  playerLastName?: string | null;
  position?: string | null;
  college?: string | null;
  status?: DraftPick_status;
  isCompensatory?: boolean;
  acquiredViaTrade?: boolean;
  selectedAt?: string | null;
  pickGrade?: string | null;
  valueGrade?: string | null;
  needsFitGrade?: string | null;
  analystNotes?: string | null;
  tradeNotes?: string | null;
}

export interface CompleteDraftPickRequestDto {
  prospectId?: number | null;
  playerId?: number | null;
  playerFirstName?: string | null;
  playerLastName?: string | null;
  position?: string | null;
  college?: string | null;
  pickGrade?: string | null;
  valueGrade?: string | null;
  needsFitGrade?: string | null;
  analystNotes?: string | null;
}

export interface DraftPickResponseDto {
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
  selectedAt: string | null;
  pickGrade: string | null;
  valueGrade: string | null;
  needsFitGrade: string | null;
  analystNotes: string | null;
  tradeNotes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DraftTeamScorecardResponseDto {
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
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EventScorecardResponseDto {
  event: DraftEventResponseDto;
  teams: DraftTeamScorecardResponseDto[];
  picks: DraftPickResponseDto[];
}

export interface TeamScorecardResponseDto {
  event: DraftEventResponseDto;
  teamScorecard: DraftTeamScorecardResponseDto | null;
  picks: DraftPickResponseDto[];
}