import { DraftEventEntity } from '../../domain/entities/DraftEventEntity';
import { DraftPickEntity } from '../../domain/entities/DraftPickEntity';
import { DraftTeamScorecardEntity } from '../../domain/entities/DraftTeamScorecardEntity';
import {
  DraftEventResponseDto,
  DraftPickResponseDto,
  DraftTeamScorecardResponseDto,
} from '../dtos/DraftDayScorecardDtos';

const toIso = (value: Date | null): string | null => {
  return value === null ? null : value.toISOString();
};

export const mapDraftEventToDto = (
  event: DraftEventEntity,
): DraftEventResponseDto => ({
  id: event.id,
  draftYear: event.draftYear,
  name: event.name,
  league: event.league,
  startsAt: toIso(event.startsAt),
  status: event.status,
  createdAt: toIso(event.createdAt),
  updatedAt: toIso(event.updatedAt),
});

export const mapDraftPickToDto = (
  pick: DraftPickEntity,
): DraftPickResponseDto => ({
  id: pick.id,
  round: pick.round,
  pickNumber: pick.pickNumber,
  pickInRound: pick.pickInRound,
  draftYear: pick.draftYear,
  draftEventId: pick.draftEventId,
  currentTeamId: pick.currentTeamId,
  originalTeam: pick.originalTeam,
  prospectId: pick.prospectId,
  playerId: pick.playerId,
  playerFirstName: pick.playerFirstName,
  playerLastName: pick.playerLastName,
  position: pick.position,
  college: pick.college,
  used: pick.used,
  status: pick.status,
  isCompensatory: pick.isCompensatory,
  acquiredViaTrade: pick.acquiredViaTrade,
  selectedAt: toIso(pick.selectedAt),
  pickGrade: pick.pickGrade,
  valueGrade: pick.valueGrade,
  needsFitGrade: pick.needsFitGrade,
  analystNotes: pick.analystNotes,
  tradeNotes: pick.tradeNotes,
  createdAt: toIso(pick.createdAt),
  updatedAt: toIso(pick.updatedAt),
});

export const mapDraftTeamScorecardToDto = (
  scorecard: DraftTeamScorecardEntity,
): DraftTeamScorecardResponseDto => ({
  id: scorecard.id,
  draftEventId: scorecard.draftEventId,
  teamId: scorecard.teamId,
  preDraftNeeds: scorecard.preDraftNeeds,
  strategyNotes: scorecard.strategyNotes,
  totalPicks: scorecard.totalPicks,
  pickedCount: scorecard.pickedCount,
  overallGrade: scorecard.overallGrade,
  valueGrade: scorecard.valueGrade,
  needsFitGrade: scorecard.needsFitGrade,
  analystSummary: scorecard.analystSummary,
  createdAt: toIso(scorecard.createdAt),
  updatedAt: toIso(scorecard.updatedAt),
});