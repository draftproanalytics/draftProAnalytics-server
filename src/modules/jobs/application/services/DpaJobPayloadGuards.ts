import type {
  ImportNflGameScoresPayloadDto,
  LoadNflSeasonSchedulePayloadDto,
} from '../../domain/dtos/NflImportPayload.dto';
import { isNflSeasonType } from '../../domain/value-objects/NflSeasonType';

interface JsonRecord {
  readonly [key: string]: unknown;
}

const asPayloadRecord = (payload: unknown): JsonRecord => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Job payload is invalid.');
  }

  return payload as JsonRecord;
};

export const readLoadNflSeasonSchedulePayload = (
  payload: unknown,
): LoadNflSeasonSchedulePayloadDto => {
  const record = asPayloadRecord(payload);

  if (typeof record.seasonYear !== 'number') {
    throw new Error('Job payload is missing seasonYear.');
  }

  if (!Array.isArray(record.seasonTypes)) {
    throw new Error('Job payload is missing seasonTypes.');
  }

  const seasonTypes = record.seasonTypes.map((value) => {
    if (typeof value !== 'number' || !isNflSeasonType(value)) {
      throw new Error('Job payload has an invalid seasonType.');
    }

    return value;
  });

  return {
    seasonYear: record.seasonYear,
    seasonTypes,
  };
};

export const readImportNflGameScoresPayload = (
  payload: unknown,
): ImportNflGameScoresPayloadDto => {
  const record = asPayloadRecord(payload);

  if (typeof record.seasonYear !== 'number') {
    throw new Error('Job payload is missing seasonYear.');
  }

  if (typeof record.seasonType !== 'number' || !isNflSeasonType(record.seasonType)) {
    throw new Error('Job payload has an invalid seasonType.');
  }

  if (typeof record.week !== 'number' || !Number.isInteger(record.week) || record.week <= 0) {
    throw new Error('Job payload has an invalid week.');
  }

  return {
    seasonYear: record.seasonYear,
    seasonType: record.seasonType,
    week: record.week,
  };
};


export const readEspnDraftYearPayload = (payload: unknown): import('../../domain/dtos/EspnDraftImport.dto').EspnDraftYearPayloadDto => {
  const record = asPayloadRecord(payload);
  if (typeof record.draftYear !== 'number' || !Number.isInteger(record.draftYear) || record.draftYear < 1936) throw new Error('Job payload has an invalid draftYear.');
  return { draftYear: record.draftYear };
};
export const readEspnDraftResultsPayload = (payload: unknown): import('../../domain/dtos/EspnDraftImport.dto').EspnDraftResultsPayloadDto => {
  const base = readEspnDraftYearPayload(payload); const record = asPayloadRecord(payload);
  return { ...base, activateMembership: record.activateMembership !== false };
};

export const readSyncEspnDraftPicksToDpaPayload = (payload: unknown): import('../../domain/dtos/EspnDraftImport.dto').SyncEspnDraftPicksToDpaPayloadDto => {
  const base = readEspnDraftYearPayload(payload); const record = asPayloadRecord(payload);
  return { ...base, overwriteExisting: record.overwriteExisting === true };
};

export const readEnrichPlayerTeamPositionsPayload = (payload: unknown): import('../../domain/dtos/EspnDraftImport.dto').EnrichPlayerTeamPositionsPayloadDto => {
  const base = readEspnDraftYearPayload(payload);
  const record = asPayloadRecord(payload);
  return { ...base, overwriteExisting: record.overwriteExisting === true };
};


export const readLoadEspnTeamRostersPayload = (payload: unknown): import('../../domain/dtos/EspnRosterImport.dto').LoadEspnTeamRostersPayloadDto => {
  const record = asPayloadRecord(payload);
  if (typeof record.seasonYear !== 'number' || !Number.isInteger(record.seasonYear) || record.seasonYear < 1920) {
    throw new Error('Job payload has an invalid seasonYear.');
  }
  const teamId = record.teamId === undefined
    ? undefined
    : (typeof record.teamId === 'number' && Number.isInteger(record.teamId) && record.teamId > 0 ? record.teamId : null);
  if (teamId === null) throw new Error('Job payload has an invalid teamId.');
  const importMode = record.importMode === 'HISTORICAL' ? 'HISTORICAL' : 'CURRENT';
  const reconcileCurrentRoster = record.reconcileCurrentRoster === true;
  if (importMode === 'HISTORICAL' && reconcileCurrentRoster) {
    throw new Error('Historical roster jobs cannot reconcile current memberships.');
  }
  return {
    seasonYear: record.seasonYear,
    teamId,
    importMode,
    reconcileCurrentRoster,
  };
};

export const readSyncPostSeasonResultsPayload = (payload: unknown): import('../../domain/dtos/PostSeasonResultSync.dto').SyncPostSeasonResultsPayloadDto => {
  const record = asPayloadRecord(payload);
  if (typeof record.seasonYear !== 'number' || !Number.isInteger(record.seasonYear)) {
    throw new Error('Job payload has an invalid seasonYear.');
  }
  return {
    seasonYear: record.seasonYear,
    overwriteExisting: record.overwriteExisting === true,
  };
};
