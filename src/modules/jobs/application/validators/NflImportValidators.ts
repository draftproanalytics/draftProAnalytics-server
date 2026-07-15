import { NflSeasonType, isNflSeasonType } from '../../domain/value-objects/NflSeasonType';
import type {
  ImportNflGameScoresPayloadDto,
  LoadNflSeasonSchedulePayloadDto,
} from '../../domain/dtos/NflImportPayload.dto';

interface RequestBody {
  readonly [key: string]: unknown;
}

const asRecord = (value: unknown): RequestBody => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Request body must be a JSON object.');
  }

  return value as RequestBody;
};

const parsePositiveInteger = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return value;
};

export const parseLoadNflSeasonSchedulePayload = (
  body: unknown,
): LoadNflSeasonSchedulePayloadDto => {
  const request = asRecord(body);
  const seasonYear = parsePositiveInteger(request.seasonYear, 'seasonYear');

  const seasonTypes = Array.isArray(request.seasonTypes)
    ? request.seasonTypes
    : [NflSeasonType.Preseason, NflSeasonType.RegularSeason, NflSeasonType.Postseason];

  const parsedSeasonTypes = seasonTypes.map((value) => {
    if (typeof value !== 'number' || !isNflSeasonType(value)) {
      throw new Error('seasonTypes must contain only 1, 2, or 3.');
    }

    return value;
  });

  const requestedByPersonId =
    typeof request.requestedByPersonId === 'number' && Number.isInteger(request.requestedByPersonId)
      ? request.requestedByPersonId
      : undefined;

  return {
    seasonYear,
    seasonTypes: parsedSeasonTypes,
    requestedByPersonId,
  };
};

export const parseImportNflGameScoresPayload = (
  body: unknown,
): ImportNflGameScoresPayloadDto => {
  const request = asRecord(body);
  const seasonYear = parsePositiveInteger(request.seasonYear, 'seasonYear');
  const week = parsePositiveInteger(request.week, 'week');

  if (typeof request.seasonType !== 'number' || !isNflSeasonType(request.seasonType)) {
    throw new Error('seasonType must be 1, 2, or 3.');
  }

  const requestedByPersonId =
    typeof request.requestedByPersonId === 'number' && Number.isInteger(request.requestedByPersonId)
      ? request.requestedByPersonId
      : undefined;

  return {
    seasonYear,
    seasonType: request.seasonType,
    week,
    requestedByPersonId,
  };
};


export const parseEspnDraftYearPayload = (body: unknown): import('../../domain/dtos/EspnDraftImport.dto').EspnDraftYearPayloadDto => {
  const request = asRecord(body); const draftYear = parsePositiveInteger(request.draftYear, 'draftYear');
  if (draftYear < 1936 || draftYear > new Date().getFullYear() + 2) throw new Error('draftYear is outside the supported range.');
  return { draftYear, requestedByPersonId: typeof request.requestedByPersonId === 'number' ? request.requestedByPersonId : undefined };
};
export const parseEspnDraftResultsPayload = (body: unknown): import('../../domain/dtos/EspnDraftImport.dto').EspnDraftResultsPayloadDto => {
  const base = parseEspnDraftYearPayload(body); const request = asRecord(body);
  return { ...base, activateMembership: request.activateMembership !== false };
};
