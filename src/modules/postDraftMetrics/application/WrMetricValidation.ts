import { WR_METRIC_FIELDS, type UpsertWrMetricCommand, type WrMetricSourceType } from '../domain/WrAdvancedMetrics.types';

const SOURCE_TYPES: ReadonlySet<string> = new Set(['DPA', 'FREE_API', 'MANUAL', 'CSV', 'LICENSED_PROVIDER', 'DERIVED']);
const LIMITS: Record<(typeof WR_METRIC_FIELDS)[number], readonly [number, number]> = {
  yardsPerRouteRun: [0, 10], receivingGrade: [0, 100], contestedCatchRate: [0, 100],
  behindLosTargetRate: [0, 100], catchRate: [0, 100], missedTacklesForcedPerReception: [0, 5],
  yacAfterContactPerReception: [0, 20],
};

export interface ValidationError { field: string; message: string }

export function validateWrMetricCommand(command: UpsertWrMetricCommand, currentYear = new Date().getUTCFullYear()): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Number.isInteger(command.prospectId) || command.prospectId <= 0) errors.push({ field: 'prospectId', message: 'prospectId must be a positive integer.' });
  if (!Number.isInteger(command.draftYear) || command.draftYear < 2010 || command.draftYear > currentYear + 5) errors.push({ field: 'draftYear', message: `draftYear must be between 2010 and ${currentYear + 5}.` });
  if (!Number.isInteger(command.seasonYear) || command.seasonYear < 2009 || command.seasonYear > command.draftYear + 1) errors.push({ field: 'seasonYear', message: 'seasonYear must be a valid year and no more than one year later than draftYear.' });
  if (typeof command.sourceName !== 'string' || command.sourceName.trim().length === 0 || command.sourceName.length > 150) errors.push({ field: 'sourceName', message: 'sourceName is required and must not exceed 150 characters.' });
  if (!SOURCE_TYPES.has(command.sourceType)) errors.push({ field: 'sourceType', message: 'sourceType is invalid.' });
  if (command.sourceReference !== undefined && command.sourceReference !== null && command.sourceReference.length > 255) errors.push({ field: 'sourceReference', message: 'sourceReference must not exceed 255 characters.' });
  let supplied = 0;
  for (const field of WR_METRIC_FIELDS) {
    const value = command[field];
    if (value === undefined || value === null) continue;
    supplied += 1;
    const [min, max] = LIMITS[field];
    if (!Number.isFinite(value) || value < min || value > max) errors.push({ field, message: `${field} must be between ${min} and ${max}.` });
  }
  if (supplied === 0) errors.push({ field: 'metrics', message: 'At least one WR metric value is required.' });
  return errors;
}

export function parseSourceType(value: string): WrMetricSourceType | null {
  const normalized = value.trim().toUpperCase();
  return SOURCE_TYPES.has(normalized) ? normalized as WrMetricSourceType : null;
}
