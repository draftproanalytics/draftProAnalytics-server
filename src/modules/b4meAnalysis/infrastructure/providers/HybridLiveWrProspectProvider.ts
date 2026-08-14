import axios, { type AxiosInstance } from 'axios';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ILiveWrProspectProvider } from '../../domain/repositories/ILiveWrProspectProvider';
import type {
  CompetitionLevel,
  LiveWrProspectPayload
} from '../../domain/contracts/LiveWrProspect.types';
import { logger } from '@/utils/Logger';

interface CfbdPlayerSeasonStatRow {
  category: string;
  statType: string;
  stat: string | number | null;
  player: string;
  team?: string;
}

interface CfbdPlayerGameStatRow {
  id?: number | string;
  player: string;
  team?: string;
  statType: string;
  stat: string | number | null;
  week?: number;
  opponent?: string;
}

interface EspnSearchAthlete {
  id?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  position?: {
    abbreviation?: string;
  };
  team?: {
    displayName?: string;
  };
}

interface InjuryAbsenceSummary {
  confirmedGamesMissedDueToInjury: number;
  injuryNotes: string[];
}

type FileBackedRecord = LiveWrProspectPayload;

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseNumericStat(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inferCompetitionLevel(teamName: string | null): CompetitionLevel {
  if (teamName === null) {
    return 'UNKNOWN';
  }

  const normalized = normalizeName(teamName);

  const powerHints = [
    'alabama',
    'georgia',
    'lsu',
    'texas',
    'oklahoma',
    'michigan',
    'ohio state',
    'oregon',
    'washington',
    'usc',
    'ucla',
    'auburn',
    'florida',
    'tennessee',
    'ole miss',
    'texas a&m',
    'notre dame',
    'penn state',
    'wisconsin',
    'indiana',
    'arizona state'
  ];

  if (powerHints.some((team) => normalized.includes(team))) {
    return 'POWER';
  }

  return 'UNKNOWN';
}

function getStat(rows: CfbdPlayerSeasonStatRow[], statType: string): number | null {
  const found = rows.find((row) => normalizeName(row.statType) === normalizeName(statType));
  return found ? parseNumericStat(found.stat) : null;
}

function countGamesPlayedFromReceivingLogs(rows: CfbdPlayerGameStatRow[]): number {
  const playedWeeks = new Set<number>();

  for (const row of rows) {
    if (typeof row.week === 'number') {
      playedWeeks.add(row.week);
    }
  }

  return playedWeeks.size;
}

function computeQbPlayQuality(
  yardsPerCatch: number | null,
  yprr: number | null
): number | null {
  if (yardsPerCatch === null && yprr === null) {
    return null;
  }

  const ypcComponent = yardsPerCatch !== null ? clamp(yardsPerCatch / 20, 0, 1) : 0.5;
  const yprrComponent = yprr !== null ? clamp(yprr / 4, 0, 1) : 0.5;
  return Number(((ypcComponent + yprrComponent) / 2).toFixed(2));
}

function buildOffensiveContextNotes(teamName: string | null, gamesPlayed: number): string {
  const team = teamName ?? 'Unknown team';
  return `${team} public-data import. Games played derived from player game logs: ${gamesPlayed}.`;
}

function uniqueByPlayer(rows: CfbdPlayerSeasonStatRow[]): CfbdPlayerSeasonStatRow[] {
  const seen = new Set<string>();
  const result: CfbdPlayerSeasonStatRow[] = [];

  for (const row of rows) {
    const key = `${normalizeName(row.player)}|${normalizeName(row.team ?? '')}|${normalizeName(row.statType)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  }

  return result;
}

function scorePlayerNameMatch(candidate: string, search: string): number {
  const normalizedCandidate = normalizeName(candidate);
  const normalizedSearch = normalizeName(search);

  if (normalizedCandidate === normalizedSearch) {
    return 100;
  }

  const searchParts = normalizedSearch.split(' ');
  const candidateParts = normalizedCandidate.split(' ');

  let score = 0;

  if (candidateParts.length > 0 && searchParts.length > 0 && candidateParts[0] === searchParts[0]) {
    score += 25;
  }

  if (
    candidateParts.length > 1 &&
    searchParts.length > 1 &&
    candidateParts[candidateParts.length - 1] === searchParts[searchParts.length - 1]
  ) {
    score += 40;
  }

  if (normalizedCandidate.includes(normalizedSearch)) {
    score += 20;
  }

  if (searchParts.every((part) => normalizedCandidate.includes(part))) {
    score += 15;
  }

  return score;
}

export class HybridLiveWrProspectProvider implements ILiveWrProspectProvider {
  private readonly cfbdClient: AxiosInstance;
  private readonly espnClient: AxiosInstance;
  private readonly injuryClient: AxiosInstance;
  private readonly cfbdApiKey: string;
  private readonly filePath: string;
  private fileCache: FileBackedRecord[] | null = null;

  public constructor(
    filePath: string = resolve(
      process.cwd(),
      'src/modules/b4meAnalysis/infrastructure/data/live-wr-prospects.json'
    )
  ) {
    this.cfbdApiKey = process.env.CFBD_API_KEY ?? '';
    this.filePath = filePath;

    this.cfbdClient = axios.create({
      baseURL: process.env.CFBD_BASE_URL ?? 'https://api.collegefootballdata.com',
      headers: this.hasUsableCfbdKey()
        ? { Authorization: `Bearer ${this.cfbdApiKey}` }
        : undefined,
      timeout: 15000
    });

    this.espnClient = axios.create({
      baseURL:
        process.env.ESPN_CFB_BASE_URL ??
        'https://site.api.espn.com/apis/site/v2/sports/football/college-football',
      timeout: 15000
    });

    this.injuryClient = axios.create({
      baseURL: process.env.CFB_INJURY_BASE_URL ?? 'https://www.cfbdepth.com',
      timeout: 15000
    });
  }

  public async findByPlayerName(
    playerName: string,
    draftYear: number | null
  ): Promise<LiveWrProspectPayload | null> {
    logger.debug('[HybridLiveWrProspectProvider] lookup', {
      playerName,
      draftYear,
      cfbdEnabled: this.hasUsableCfbdKey()
    });

    const cfbdResult = await this.tryCfbdBranch(playerName, draftYear);
    logger.debug('[HybridLiveWrProspectProvider] cfbdResult found =', cfbdResult !== null);

    if (cfbdResult !== null) {
      return cfbdResult;
    }

    const fileResult = await this.tryFileBranch(playerName, draftYear);
    logger.debug('[HybridLiveWrProspectProvider] fileResult found =', fileResult !== null);

    if (fileResult !== null) {
      return fileResult;
    }

    return null;
  }

  private async tryCfbdBranch(
    playerName: string,
    draftYear: number | null
  ): Promise<LiveWrProspectPayload | null> {
    if (!this.hasUsableCfbdKey() || draftYear === null) {
      return null;
    }

    const normalizedSearch = normalizeName(playerName);
    const metricSeasonYear = draftYear - 1;
    const espnIdentity = await this.findEspnIdentity(normalizedSearch);
    const seasonRows = await this.fetchBestCfbdSeasonStats(playerName, metricSeasonYear);

    if (seasonRows.length === 0) {
      return null;
    }

    const resolvedName = seasonRows[0].player;
    const nameParts = this.splitName(resolvedName);
    const teamName = seasonRows[0].team ?? espnIdentity?.team?.displayName ?? null;

    const gameRows = await this.fetchCfbdGameStats(resolvedName, metricSeasonYear);
    const gamesPlayed = countGamesPlayedFromReceivingLogs(gameRows);

    const injurySummary = await this.fetchConfirmedInjuryAbsences(
      resolvedName,
      teamName,
      metricSeasonYear
    );

    const receptions = getStat(seasonRows, 'REC');
    const receivingYards = getStat(seasonRows, 'YDS');
    const yardsPerCatch = getStat(seasonRows, 'YPC');
    const touchdowns = getStat(seasonRows, 'TD');
    const targets = getStat(seasonRows, 'TGT');

    const yprr = this.deriveYprr(receivingYards, gameRows);
    const contestedCatchRate = this.deriveContestedCatchRate(receptions, targets);
    const behindLosTargetRate = this.deriveBehindLosTargetRate(yardsPerCatch);
    const missedTacklesForcedPerReception =
      this.deriveMissedTacklesForcedPerReception(yardsPerCatch);
    const yacAfterContactPerReception =
      this.deriveYacAfterContactPerReception(yardsPerCatch);
    const pressManWinRate = this.derivePressManWinRate(yardsPerCatch, yprr);
    const releasePackageDepth = this.deriveReleasePackageDepth(yardsPerCatch);
    const routeFamilyDiversity = this.deriveRouteFamilyDiversity(receptions, targets);
    const alignmentFlexibilityIndex = this.deriveAlignmentFlexibilityIndex(targets);
    const rolePortabilityIndex = this.deriveRolePortabilityIndex(yardsPerCatch, yprr);
    const usageAdaptabilityIndex = this.deriveUsageAdaptabilityIndex(targets, receptions);
    const slotRate = this.deriveSlotRate(yardsPerCatch);
    const wideRate = this.deriveWideRate(slotRate);
    const boundaryRate = this.deriveBoundaryRate(wideRate);
    const pffOverallGrade = this.derivePublicGrade(yprr, yardsPerCatch, touchdowns);
    const qbPlayQuality = computeQbPlayQuality(yardsPerCatch, yprr);
    const competitionLevel = inferCompetitionLevel(teamName);

    const sourcesUsed: string[] = ['CFBD season stats'];
    if (gameRows.length > 0) {
      sourcesUsed.push('CFBD game stats');
    }
    if (espnIdentity !== null) {
      sourcesUsed.push('ESPN athlete lookup');
    }
    if (injurySummary.injuryNotes.length > 0) {
      sourcesUsed.push('Public injury feed');
    }

    return {
      playerName: resolvedName,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
      school: teamName,
      draftYear,
      position: 'WR',
      sourceMetadata: {
        provider: 'HYBRID_PUBLIC',
        playerSearchName: playerName,
        resolvedPlayerName: resolvedName,
        draftYear,
        sourcesUsed,
        observedFields: [
          'receptions',
          'targets',
          'gamesPlayed'
        ],
        derivedFields: [
          'yprr',
          'pffOverallGrade',
          'contestedCatchRate',
          'behindLosTargetRate',
          'missedTacklesForcedPerReception',
          'yacAfterContactPerReception',
          'pressManWinRate',
          'releasePackageDepth',
          'routeFamilyDiversity',
          'alignmentFlexibilityIndex',
          'rolePortabilityIndex',
          'usageAdaptabilityIndex',
          'slotRate',
          'wideRate',
          'boundaryRate',
          'routesRun'
        ],
        metricSeasonYear,
        seasonSelectionPolicy: 'FINAL_COLLEGE_SEASON',
        injuryMissedGamesIsConfirmedOnly: true,
        notes: [
          `Metrics selected from the final college season (${metricSeasonYear}) for the ${draftYear} draft class.`,
          ...injurySummary.injuryNotes
        ]
      },
      metrics: {
        yprr,
        pffOverallGrade,
        contestedCatchRate,
        behindLosTargetRate,
        receptions,
        targets,
        missedTacklesForcedPerReception,
        yacAfterContactPerReception,
        routesRun: this.estimateRoutesRun(gameRows, targets),
        gamesPlayed,
        gamesMissed: injurySummary.confirmedGamesMissedDueToInjury,
        competitionLevel,
        offensiveContextNotes: this.mergeNotes(
          buildOffensiveContextNotes(teamName, gamesPlayed),
          injurySummary.injuryNotes
        ),
        qbPlayQuality,
        pffRank: null,
        yprrRank: null,
        pressManWinRate,
        releasePackageDepth,
        routeFamilyDiversity,
        alignmentFlexibilityIndex,
        rolePortabilityIndex,
        usageAdaptabilityIndex,
        slotRate,
        wideRate,
        boundaryRate
      }
    };
  }

  private async fetchBestCfbdSeasonStats(
    playerName: string,
    year: number
  ): Promise<CfbdPlayerSeasonStatRow[]> {
    const parts = playerName.trim().split(/\s+/).filter(Boolean);
    const searchTerms = Array.from(
      new Set([
        playerName.trim(),
        parts.length > 0 ? parts[parts.length - 1] : '',
        parts.length > 0 ? parts[0] : ''
      ].filter((term) => term.length > 0))
    );

    const combined: CfbdPlayerSeasonStatRow[] = [];

    for (const term of searchTerms) {
      const rows = await this.fetchCfbdSeasonStats(term, year);
      combined.push(...rows);
    }

    const deduped = uniqueByPlayer(combined);
    if (deduped.length === 0) {
      logger.debug('[HybridLiveWrProspectProvider] no CFBD season rows for search terms', searchTerms);
      return [];
    }

    const grouped = new Map<string, CfbdPlayerSeasonStatRow[]>();

    for (const row of deduped) {
      const key = `${normalizeName(row.player)}|${normalizeName(row.team ?? '')}`;
      const existing = grouped.get(key) ?? [];
      existing.push(row);
      grouped.set(key, existing);
    }

    const ranked = Array.from(grouped.entries())
      .map(([key, rows]) => ({
        key,
        rows,
        score: scorePlayerNameMatch(rows[0].player, playerName)
      }))
      .sort((a, b) => b.score - a.score);

    if (ranked.length === 0 || ranked[0].score <= 0) {
      logger.debug('[HybridLiveWrProspectProvider] CFBD rows found but no strong match', {
        playerName,
        candidates: Array.from(grouped.values()).map((rows) => rows[0].player)
      });
      return [];
    }

    logger.debug('[HybridLiveWrProspectProvider] CFBD best match', {
      playerName,
      matchedPlayer: ranked[0].rows[0].player,
      score: ranked[0].score
    });

    return ranked[0].rows;
  }

  private async tryFileBranch(
    playerName: string,
    draftYear: number | null
  ): Promise<LiveWrProspectPayload | null> {
    const records = await this.loadFileRecords();
    const normalizedSearch = normalizeName(playerName);

    const exactMatch = records.find((record) => {
      if (record.position !== 'WR') {
        return false;
      }

      if (draftYear !== null && record.draftYear !== draftYear) {
        return false;
      }

      return (
        normalizeName(record.playerName) === normalizedSearch ||
        normalizeName(`${record.firstName} ${record.lastName}`) === normalizedSearch
      );
    });

    if (exactMatch !== undefined) {
      return {
        ...exactMatch,
        sourceMetadata: {
          ...exactMatch.sourceMetadata,
          provider: 'HYBRID_PUBLIC',
          sourcesUsed: Array.from(
            new Set(['Local file fallback', ...(exactMatch.sourceMetadata.sourcesUsed ?? [])])
          ),
          notes: Array.from(
            new Set([
              ...(exactMatch.sourceMetadata.notes ?? []),
              ...(this.hasUsableCfbdKey() ? [] : ['CFBD disabled: missing or placeholder API key.'])
            ])
          )
        }
      };
    }

    return null;
  }

  private async loadFileRecords(): Promise<FileBackedRecord[]> {
    if (this.fileCache !== null) {
      return this.fileCache;
    }

    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        this.fileCache = [];
        return this.fileCache;
      }

      this.fileCache = parsed as FileBackedRecord[];
      return this.fileCache;
    } catch {
      this.fileCache = [];
      return this.fileCache;
    }
  }

  private hasUsableCfbdKey(): boolean {
    const key = this.cfbdApiKey.trim();
    return key.length > 0 && key !== 'your_cfbd_key';
  }

  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: parts[0] };
    }

    return {
      firstName: parts[0],
      lastName: parts[parts.length - 1]
    };
  }

  private async findEspnIdentity(normalizedSearch: string): Promise<EspnSearchAthlete | null> {
    try {
      const response = await this.espnClient.get<{ athletes?: EspnSearchAthlete[] }>(
        '/athletes',
        { params: { limit: 50 } }
      );

      const athletes = response.data.athletes ?? [];
      const match = athletes.find((athlete) => {
        const fullName = normalizeName(athlete.displayName ?? '');
        return fullName === normalizedSearch && athlete.position?.abbreviation === 'WR';
      });

      return match ?? null;
    } catch {
      return null;
    }
  }

  private async fetchCfbdSeasonStats(
    playerName: string,
    year: number | null
  ): Promise<CfbdPlayerSeasonStatRow[]> {
    if (year === null || !this.hasUsableCfbdKey()) {
      return [];
    }

    try {
      const response = await this.cfbdClient.get<CfbdPlayerSeasonStatRow[]>(
        '/stats/player/season',
        {
          params: {
            year,
            player: playerName,
            category: 'receiving'
          }
        }
      );

      return response.data;
    } catch {
      return [];
    }
  }

  private async fetchCfbdGameStats(
    playerName: string,
    year: number | null
  ): Promise<CfbdPlayerGameStatRow[]> {
    if (year === null || !this.hasUsableCfbdKey()) {
      return [];
    }

    try {
      const response = await this.cfbdClient.get<CfbdPlayerGameStatRow[]>(
        '/stats/player/game',
        {
          params: {
            year,
            player: playerName,
            category: 'receiving'
          }
        }
      );

      return response.data.filter(
        (row) => normalizeName(row.player) === normalizeName(playerName)
      );
    } catch {
      return [];
    }
  }

  private async fetchConfirmedInjuryAbsences(
    playerName: string,
    teamName: string | null,
    _draftYear: number | null
  ): Promise<InjuryAbsenceSummary> {
    if (teamName === null) {
      return {
        confirmedGamesMissedDueToInjury: 0,
        injuryNotes: []
      };
    }

    try {
      const response = await this.injuryClient.get<string>('/injury-report/', {
        responseType: 'text' as const
      });

      const html = response.data;
      const normalizedHtml = normalizeName(html);
      const normalizedPlayer = normalizeName(playerName);
      const normalizedTeam = normalizeName(teamName);

      if (
        !normalizedHtml.includes(normalizedTeam) ||
        !normalizedHtml.includes(normalizedPlayer)
      ) {
        return {
          confirmedGamesMissedDueToInjury: 0,
          injuryNotes: []
        };
      }

      const outCount =
        (
          normalizedHtml.match(
            new RegExp(`${normalizedPlayer}[^<]{0,120}(out|questionable|doubtful)`, 'g')
          ) ?? []
        ).length;

      return {
        confirmedGamesMissedDueToInjury: outCount,
        injuryNotes:
          outCount > 0
            ? [`Public injury feed matched ${outCount} injury-status entries for ${playerName}.`]
            : []
      };
    } catch {
      return {
        confirmedGamesMissedDueToInjury: 0,
        injuryNotes: []
      };
    }
  }

  private deriveYprr(
    receivingYards: number | null,
    gameRows: CfbdPlayerGameStatRow[]
  ): number | null {
    if (receivingYards === null) {
      return null;
    }

    const estimatedRoutes = this.estimateRoutesRun(gameRows, null);
    if (estimatedRoutes === null || estimatedRoutes <= 0) {
      return null;
    }

    return Number((receivingYards / estimatedRoutes).toFixed(2));
  }

  private estimateRoutesRun(
    gameRows: CfbdPlayerGameStatRow[],
    targets: number | null
  ): number | null {
    if (targets !== null) {
      return Math.round(targets * 2.3);
    }

    const targetRows = gameRows.filter(
      (row) => normalizeName(row.statType) === 'tgt'
    );
    const totalTargets = targetRows.reduce<number>(
      (sum, row) => sum + (parseNumericStat(row.stat) ?? 0),
      0
    );

    return totalTargets > 0 ? Math.round(totalTargets * 2.3) : null;
  }

  private deriveContestedCatchRate(
    receptions: number | null,
    targets: number | null
  ): number | null {
    if (receptions === null || targets === null || targets === 0) {
      return null;
    }

    return Number(clamp((receptions / targets) * 70, 25, 70).toFixed(1));
  }

  private deriveBehindLosTargetRate(yardsPerCatch: number | null): number | null {
    if (yardsPerCatch === null) {
      return null;
    }

    return Number(clamp(22 - yardsPerCatch, 4, 24).toFixed(1));
  }

  private deriveMissedTacklesForcedPerReception(
    yardsPerCatch: number | null
  ): number | null {
    if (yardsPerCatch === null) {
      return null;
    }

    return Number(clamp(yardsPerCatch / 100, 0.05, 0.22).toFixed(2));
  }

  private deriveYacAfterContactPerReception(
    yardsPerCatch: number | null
  ): number | null {
    if (yardsPerCatch === null) {
      return null;
    }

    return Number(clamp(yardsPerCatch / 6, 0.8, 3.5).toFixed(2));
  }

  private derivePressManWinRate(
    yardsPerCatch: number | null,
    yprr: number | null
  ): number | null {
    if (yardsPerCatch === null && yprr === null) {
      return null;
    }

    const ypc = yardsPerCatch ?? 12;
    const yprrValue = yprr ?? 2.0;
    return Number(clamp(((ypc / 20) + yprrValue / 4) / 2, 0.35, 0.7).toFixed(2));
  }

  private deriveReleasePackageDepth(yardsPerCatch: number | null): number | null {
    if (yardsPerCatch === null) {
      return null;
    }

    return Math.round(clamp(yardsPerCatch / 5, 1, 5));
  }

  private deriveRouteFamilyDiversity(
    receptions: number | null,
    targets: number | null
  ): number | null {
    if (receptions === null || targets === null) {
      return null;
    }

    return Math.round(clamp((receptions / Math.max(targets, 1)) * 10, 3, 9));
  }

  private deriveAlignmentFlexibilityIndex(targets: number | null): number | null {
    if (targets === null) {
      return null;
    }

    return Math.round(clamp(targets / 12, 2, 8));
  }

  private deriveRolePortabilityIndex(
    yardsPerCatch: number | null,
    yprr: number | null
  ): number | null {
    if (yardsPerCatch === null && yprr === null) {
      return null;
    }

    const value = ((yardsPerCatch ?? 12) / 4) + ((yprr ?? 2) * 1.2);
    return Math.round(clamp(value, 3, 9));
  }

  private deriveUsageAdaptabilityIndex(
    targets: number | null,
    receptions: number | null
  ): number | null {
    if (targets === null || receptions === null) {
      return null;
    }

    return Math.round(clamp((targets + receptions) / 20, 3, 8));
  }

  private deriveSlotRate(yardsPerCatch: number | null): number | null {
    if (yardsPerCatch === null) {
      return null;
    }

    return Number(clamp(55 - yardsPerCatch * 2, 10, 65).toFixed(1));
  }

  private deriveWideRate(slotRate: number | null): number | null {
    if (slotRate === null) {
      return null;
    }

    return Number((100 - slotRate).toFixed(1));
  }

  private deriveBoundaryRate(wideRate: number | null): number | null {
    if (wideRate === null) {
      return null;
    }

    return Number(clamp(wideRate * 0.78, 15, 85).toFixed(1));
  }

  private derivePublicGrade(
    yprr: number | null,
    yardsPerCatch: number | null,
    touchdowns: number | null
  ): number | null {
    if (yprr === null && yardsPerCatch === null && touchdowns === null) {
      return null;
    }

    const yprrComponent = yprr !== null ? yprr * 12 : 24;
    const ypcComponent = yardsPerCatch !== null ? yardsPerCatch * 1.9 : 22;
    const tdComponent = touchdowns !== null ? touchdowns * 1.5 : 6;
    return Number(clamp(35 + yprrComponent + ypcComponent + tdComponent, 55, 92).toFixed(1));
  }

  private mergeNotes(base: string, notes: string[]): string {
    return notes.length > 0 ? `${base} ${notes.join(' ')}` : base;
  }
}