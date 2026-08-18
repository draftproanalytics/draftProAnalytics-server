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

  if (typeof request.seasonType !== 'number' || !isNflSeasonType(request.seasonType)) {
    throw new Error('seasonType must be 1, 2, or 3.');
  }

  if (typeof request.week !== 'number' || !Number.isInteger(request.week)) {
    throw new Error('week must be an integer.');
  }

  const minimumWeek = request.seasonType === 1 ? 0 : 1;
  if (request.week < minimumWeek) {
    throw new Error(`week must be at least ${minimumWeek} for the selected season type.`);
  }

  const week = request.week;
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

export const parseSyncEspnDraftPicksToDpaPayload = (body: unknown): import('../../domain/dtos/EspnDraftImport.dto').SyncEspnDraftPicksToDpaPayloadDto => {
  const base = parseEspnDraftYearPayload(body); const request = asRecord(body);
  return { ...base, overwriteExisting: request.overwriteExisting === true };
};

export const parseEnrichPlayerTeamPositionsPayload = (body: unknown): import('../../domain/dtos/EspnDraftImport.dto').EnrichPlayerTeamPositionsPayloadDto => {
  const base = parseEspnDraftYearPayload(body);
  const request = asRecord(body);
  return { ...base, overwriteExisting: request.overwriteExisting === true };
};


export const parseLoadEspnTeamRostersPayload = (body: unknown): import('../../domain/dtos/EspnRosterImport.dto').LoadEspnTeamRostersPayloadDto => {
  const request = asRecord(body);
  const seasonYear = parsePositiveInteger(request.seasonYear, 'seasonYear');
  const currentYear = new Date().getFullYear();
  if (seasonYear < 1920 || seasonYear > currentYear + 1) {
    throw new Error('seasonYear is outside the supported range.');
  }
  let teamId: number | undefined;
  if (request.teamId !== undefined && request.teamId !== null) {
    teamId = parsePositiveInteger(request.teamId, 'teamId');
  }
  const requestedByPersonId = typeof request.requestedByPersonId === 'number' && Number.isInteger(request.requestedByPersonId)
    ? request.requestedByPersonId
    : undefined;
  const importMode = request.importMode === 'HISTORICAL' ? 'HISTORICAL' : 'CURRENT';
  const reconcileCurrentRoster = request.reconcileCurrentRoster === true;
  if (importMode === 'HISTORICAL' && reconcileCurrentRoster) {
    throw new Error('reconcileCurrentRoster is only allowed for CURRENT imports.');
  }
  return {
    seasonYear,
    teamId,
    importMode,
    reconcileCurrentRoster,
    requestedByPersonId,
  };
};

export const parseSyncPostSeasonResultsPayload = (body: unknown): import('../../domain/dtos/PostSeasonResultSync.dto').SyncPostSeasonResultsPayloadDto => {
  const request = asRecord(body);
  const seasonYear = parsePositiveInteger(request.seasonYear, 'seasonYear');
  const currentYear = new Date().getFullYear();
  if (seasonYear < 1933 || seasonYear > currentYear) {
    throw new Error('seasonYear is outside the supported completed-season range.');
  }
  return {
    seasonYear,
    overwriteExisting: request.overwriteExisting === true,
    requestedByPersonId: typeof request.requestedByPersonId === 'number' ? request.requestedByPersonId : undefined,
  };
};


export const parseGenerateTeamNeedsPayload = (body: unknown): import('../../domain/dtos/GenerateTeamNeeds.dto').GenerateTeamNeedsPayloadDto => {
  const request = asRecord(body);
  const draftYear = parsePositiveInteger(request.draftYear, 'draftYear');
  if (draftYear < 1936 || draftYear > 2155) throw new Error('draftYear is outside the supported range.');
  if (typeof request.asOfDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(request.asOfDate) || Number.isNaN(Date.parse(`${request.asOfDate}T00:00:00Z`))) {
    throw new Error('asOfDate must be a valid YYYY-MM-DD date.');
  }
  let teamId: number | undefined;
  if (request.teamId !== undefined && request.teamId !== null) teamId = parsePositiveInteger(request.teamId, 'teamId');
  const algorithmVersion = typeof request.algorithmVersion === 'string' && request.algorithmVersion.trim() !== ''
    ? request.algorithmVersion.trim()
    : 'team-needs-v4';
  if (algorithmVersion.length > 32) throw new Error('algorithmVersion must not exceed 32 characters.');
  return {
    draftYear,
    asOfDate: request.asOfDate,
    teamId,
    replaceRecommendations: request.replaceRecommendations !== false,
    algorithmVersion,
    requestedByPersonId: typeof request.requestedByPersonId === 'number' && Number.isInteger(request.requestedByPersonId) ? request.requestedByPersonId : undefined,
  };
};

export const parseImportNflversePlayerProductionPayload = (body: unknown): { seasonYear: number; teamId?: number; summaryLevel: 'reg' | 'post' | 'regpost'; requestedByPersonId?: number } => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Request body is required.');
  const row = body as Record<string, unknown>; const seasonYear = Number(row.seasonYear);
  if (!Number.isInteger(seasonYear) || seasonYear < 1999 || seasonYear > 2100) throw new Error('seasonYear must be a valid NFL season.');
  const summaryLevel = row.summaryLevel === 'post' || row.summaryLevel === 'regpost' ? row.summaryLevel : 'reg';
  const teamId = row.teamId === undefined || row.teamId === null ? undefined : Number(row.teamId);
  if (teamId !== undefined && (!Number.isInteger(teamId) || teamId <= 0)) throw new Error('teamId must be a positive integer.');
  const requestedByPersonId = typeof row.requestedByPersonId === 'number' ? row.requestedByPersonId : undefined;
  return { seasonYear, teamId, summaryLevel, requestedByPersonId };
};
