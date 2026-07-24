import type { UpsertWrMetricCommand } from '../domain/WrAdvancedMetrics.types';
import { parseSourceType } from './WrMetricValidation';

export interface ParsedCsvRow { rowNumber: number; raw: Record<string, string>; command: UpsertWrMetricCommand | null; parseErrors: Array<{ field: string; message: string }> }

function splitCsvLine(line: string): string[] {
  const cells: string[] = []; let current = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(current); current = ''; }
    else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

const numberValue = (raw: string, field: string, integer: boolean, errors: Array<{ field: string; message: string }>): number | undefined => {
  if (raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || (integer && !Number.isInteger(value))) { errors.push({ field, message: `${field} must be ${integer ? 'an integer' : 'numeric'}.` }); return undefined; }
  return value;
};

const booleanValue = (raw: string, errors: Array<{ field: string; message: string }>): boolean | undefined => {
  if (raw === '') return undefined;
  if (raw.toLowerCase() === 'true') return true;
  if (raw.toLowerCase() === 'false') return false;
  errors.push({ field: 'verified', message: 'verified must be true or false.' }); return undefined;
};

export function parseWrMetricCsv(csv: string): ParsedCsvRow[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw Object.assign(new Error('CSV must contain a header and at least one data row.'), { statusCode: 400 });
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line, offset) => {
    const values = splitCsvLine(line); const raw: Record<string, string> = {};
    headers.forEach((header, index) => { raw[header] = values[index] ?? ''; });
    const errors: Array<{ field: string; message: string }> = [];
    const sourceType = parseSourceType(raw.sourceType ?? '');
    if (sourceType === null) errors.push({ field: 'sourceType', message: 'sourceType is invalid.' });
    const command: UpsertWrMetricCommand = {
      prospectId: numberValue(raw.prospectId ?? '', 'prospectId', true, errors) ?? 0,
      draftYear: numberValue(raw.draftYear ?? '', 'draftYear', true, errors) ?? 0,
      seasonYear: numberValue(raw.seasonYear ?? '', 'seasonYear', true, errors) ?? 0,
      yardsPerRouteRun: numberValue(raw.yardsPerRouteRun ?? '', 'yardsPerRouteRun', false, errors),
      receivingGrade: numberValue(raw.receivingGrade ?? '', 'receivingGrade', false, errors),
      contestedCatchRate: numberValue(raw.contestedCatchRate ?? '', 'contestedCatchRate', false, errors),
      behindLosTargetRate: numberValue(raw.behindLosTargetRate ?? '', 'behindLosTargetRate', false, errors),
      catchRate: numberValue(raw.catchRate ?? '', 'catchRate', false, errors),
      missedTacklesForcedPerReception: numberValue(raw.missedTacklesForcedPerReception ?? '', 'missedTacklesForcedPerReception', false, errors),
      yacAfterContactPerReception: numberValue(raw.yacAfterContactPerReception ?? '', 'yacAfterContactPerReception', false, errors),
      sourceName: raw.sourceName ?? '', sourceType: sourceType ?? 'CSV', sourceReference: raw.sourceReference || null,
      verified: booleanValue(raw.verified ?? '', errors) ?? false, notes: raw.notes || null, rawPayload: raw,
    };
    return { rowNumber: offset + 2, raw, command: errors.length === 0 ? command : null, parseErrors: errors };
  });
}
