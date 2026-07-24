import { describe, expect, it } from 'vitest';
import { parseWrMetricCsv } from '../../src/modules/postDraftMetrics/application/CsvWrMetricParser';

describe('parseWrMetricCsv', () => {
  it('parses a valid CSV row', () => {
    const rows = parseWrMetricCsv('prospectId,draftYear,seasonYear,yardsPerRouteRun,sourceName,sourceType,verified,notes\n123,2026,2025,3.12,Licensed Export,CSV,false,"authorized, export"');
    expect(rows[0].command?.yardsPerRouteRun).toBe(3.12);
    expect(rows[0].command?.notes).toBe('authorized, export');
  });
  it('reports numeric and boolean parse failures', () => {
    const rows = parseWrMetricCsv('prospectId,draftYear,seasonYear,yardsPerRouteRun,sourceName,sourceType,verified\nabc,2026,2025,nope,Export,CSV,maybe');
    expect(rows[0].command).toBeNull();
    expect(rows[0].parseErrors.map((error) => error.field)).toEqual(expect.arrayContaining(['prospectId', 'yardsPerRouteRun', 'verified']));
  });
});
