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
