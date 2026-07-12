import {
  DraftEvent_status,
  DraftPick_status,
  Prisma,
} from '@prisma/client';
import { DraftEventEntity } from '../entities/DraftEventEntity';
import { DraftPickEntity } from '../entities/DraftPickEntity';
import { DraftTeamScorecardEntity } from '../entities/DraftTeamScorecardEntity';

export interface CreateDraftEventInput {
  draftYear: number;
  name: string;
  league: string;
  startsAt: Date | null;
  status: DraftEvent_status;
}

export interface SeedDraftPickInput {
  round: number;
  pickNumber: number;
  pickInRound?: number;
  currentTeamId: number;
  originalTeam?: number | null;
  isCompensatory?: boolean;
  acquiredViaTrade?: boolean;
  tradeNotes?: string | null;
}

export interface UpdateDraftPickInput {
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
  selectedAt?: Date | null;
  pickGrade?: string | null;
  valueGrade?: string | null;
  needsFitGrade?: string | null;
  analystNotes?: string | null;
  tradeNotes?: string | null;
}

export interface DraftPickAuditInput {
  draftPickId: number;
  draftEventId: number;
  action: string;
  changedByPersonId: number | null;
  previousSnapshot: Prisma.InputJsonValue | null;
  nextSnapshot: Prisma.InputJsonValue;
  notes: string | null;
}

export interface EventScorecardResult {
  event: DraftEventEntity;
  teams: DraftTeamScorecardEntity[];
  picks: DraftPickEntity[];
}

export interface TeamScorecardResult {
  event: DraftEventEntity;
  teamScorecard: DraftTeamScorecardEntity | null;
  picks: DraftPickEntity[];
}

export interface IDraftDayScorecardRepository {
  createEvent(input: CreateDraftEventInput): Promise<DraftEventEntity>;
  listEvents(): Promise<DraftEventEntity[]>;
  getEventById(draftEventId: number): Promise<DraftEventEntity | null>;
  getEventScorecard(draftEventId: number): Promise<EventScorecardResult | null>;
  getTeamScorecard(draftEventId: number, teamId: number): Promise<TeamScorecardResult | null>;

  seedPicks(
    draftEventId: number,
    draftYear: number,
    picks: SeedDraftPickInput[],
    changedByPersonId: number | null,
  ): Promise<DraftPickEntity[]>;

  getPickById(draftPickId: number): Promise<DraftPickEntity | null>;

  updatePick(
    draftPickId: number,
    input: UpdateDraftPickInput,
    changedByPersonId: number | null,
    action: string,
  ): Promise<DraftPickEntity>;

  writeAuditLog(input: DraftPickAuditInput): Promise<void>;
  refreshTeamScorecards(draftEventId: number): Promise<void>;
}