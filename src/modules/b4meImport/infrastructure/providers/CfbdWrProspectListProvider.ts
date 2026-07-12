import axios, { type AxiosInstance } from 'axios';
import type { ILiveWrProspectListProvider } from '../../domain/repositories/ILiveWrProspectListProvider';
import type { WrImportCandidate } from '../../domain/contracts/WrImportCandidate';

interface CfbdPlayerSeasonStatRow {
  player: string;
  team?: string;
  statType: string;
  stat: string | number | null;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class CfbdWrProspectListProvider implements ILiveWrProspectListProvider {
  private readonly cfbdClient: AxiosInstance;
  private readonly cfbdApiKey: string;

  public constructor() {
    this.cfbdApiKey = process.env.CFBD_API_KEY ?? '';

    this.cfbdClient = axios.create({
      baseURL: process.env.CFBD_BASE_URL ?? 'https://api.collegefootballdata.com',
      headers: this.hasUsableCfbdKey()
        ? { Authorization: `Bearer ${this.cfbdApiKey}` }
        : undefined,
      timeout: 15000
    });
  }

  public async listByDraftYear(draftYear: number): Promise<readonly WrImportCandidate[]> {
    if (!this.hasUsableCfbdKey()) {
      return [];
    }

    try {
      const response = await this.cfbdClient.get<CfbdPlayerSeasonStatRow[]>(
        '/stats/player/season',
        {
          params: {
            year: draftYear,
            category: 'receiving'
          }
        }
      );

      const grouped = new Map<string, WrImportCandidate>();

      for (const row of response.data) {
        const playerName = row.player?.trim();

        if (!playerName || playerName.split(/\s+/).length < 2) {
          continue;
        }

        const key = `${normalizeName(playerName)}|${normalizeName(row.team ?? '')}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            playerName,
            draftYear,
            school: row.team ?? null
          });
        }
      }

      return Array.from(grouped.values()).sort((a, b) =>
        a.playerName.localeCompare(b.playerName)
      );
    } catch {
      return [];
    }
  }

  private hasUsableCfbdKey(): boolean {
    const key = this.cfbdApiKey.trim();
    return key.length > 0 && key !== 'your_cfbd_key';
  }
}
