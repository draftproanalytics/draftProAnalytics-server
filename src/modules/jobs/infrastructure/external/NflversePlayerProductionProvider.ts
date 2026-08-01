import axios from 'axios';
import type { NflversePlayerProductionRecordDto } from '../../domain/dtos/NflversePlayerProduction.dto';
import type { INflversePlayerProductionProvider } from '../../domain/services/INflversePlayerProductionProvider';

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else { quoted = !quoted; }
    } else if (char === ',' && !quoted) { values.push(current); current = ''; }
    else { current += char; }
  }
  values.push(current);
  return values;
};
const numericOrText = (value: string): string | number | null => {
  if (value === '' || value.toUpperCase() === 'NA') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};
const METRIC_COLUMNS = [
  'games','completions','attempts','passing_yards','passing_tds','passing_interceptions',
  'carries','rushing_yards','rushing_tds','receptions','targets','receiving_yards','receiving_tds',
  'receiving_first_downs','receiving_air_yards','receiving_yards_after_catch','receiving_epa',
  'fantasy_points','fantasy_points_ppr','tackles_solo','tackles_with_assist','sacks','interceptions','passes_defended'
] as const;

export class NflversePlayerProductionProvider implements INflversePlayerProductionProvider {
  public async fetchSeason(seasonYear: number, summaryLevel: 'reg' | 'post' | 'regpost'): Promise<readonly NflversePlayerProductionRecordDto[]> {
    const url = `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_${summaryLevel}_${seasonYear}.csv`;
    const response = await axios.get<string>(url, { responseType: 'text', timeout: 120000 });
    const lines = response.data.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) throw new Error(`nflverse returned no player statistics for ${seasonYear}.`);
    const headers = parseCsvLine(lines[0]);
    const indexes = new Map(headers.map((header, index) => [header, index]));
    const read = (row: string[], name: string): string => row[indexes.get(name) ?? -1] ?? '';
    return lines.slice(1).map((line) => {
      const row = parseCsvLine(line);
      const metrics: Record<string, string | number | null> = {};
      for (const name of METRIC_COLUMNS) metrics[name] = numericOrText(read(row, name));
      return {
        externalPlayerId: read(row, 'player_id'),
        playerName: read(row, 'player_display_name') || read(row, 'player_name'),
        teamAbbreviation: read(row, 'recent_team') || read(row, 'team') || read(row, 'current_team') || undefined,
        position: read(row, 'position') || undefined,
        positionGroup: read(row, 'position_group') || undefined,
        metrics,
      };
    }).filter((row) => row.externalPlayerId !== '' && row.playerName !== '');
  }
}
