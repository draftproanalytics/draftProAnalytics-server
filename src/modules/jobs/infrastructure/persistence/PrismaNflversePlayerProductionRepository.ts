import type { Prisma, PrismaClient } from '@prisma/client';
import type { NflversePlayerProductionRecordDto } from '../../domain/dtos/NflversePlayerProduction.dto';
import type { INflversePlayerProductionRepository, StageNflverseProductionResult } from '../../domain/repositories/INflversePlayerProductionRepository';

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeTeam = (value: string): string => ({ JAX: 'JAC', LA: 'LAR', STL: 'LAR', OAK: 'LV', SD: 'LAC' } as Record<string, string>)[value.toUpperCase()] ?? value.toUpperCase();
const positionGroup = (value?: string): string => {
  const p = (value ?? '').toUpperCase();
  if (['WR','TE','QB','RB','FB','CB','S','K','P'].includes(p)) return p === 'FB' ? 'RB' : p;
  if (['OT','T'].includes(p)) return 'OT';
  if (['C','G','OG','OL'].includes(p)) return 'IOL';
  if (['DE','EDGE','OLB'].includes(p)) return 'EDGE';
  if (['DT','NT','DL'].includes(p)) return 'DT';
  if (['LB','ILB','MLB'].includes(p)) return 'LB';
  return p || 'UNK';
};
const metric = (json: Prisma.JsonValue, key: string): number => {
  if (!json || Array.isArray(json) || typeof json !== 'object') return 0;
  const value = (json as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};
const productionScore = (position: string, metrics: Prisma.JsonValue): number => {
  if (position === 'WR' || position === 'TE') return Math.min(100, metric(metrics,'receiving_yards') / 12 + metric(metrics,'receiving_tds') * 3 + metric(metrics,'receptions') * .15);
  if (position === 'RB') return Math.min(100, (metric(metrics,'rushing_yards') + metric(metrics,'receiving_yards')) / 15 + (metric(metrics,'rushing_tds') + metric(metrics,'receiving_tds')) * 2);
  if (position === 'QB') return Math.min(100, metric(metrics,'passing_yards') / 50 + metric(metrics,'passing_tds') * 1.2 - metric(metrics,'passing_interceptions'));
  if (['EDGE','DT','LB'].includes(position)) return Math.min(100, metric(metrics,'sacks') * 6 + metric(metrics,'tackles_solo') * .7 + metric(metrics,'tackles_with_assist') * .25);
  if (['CB','S'].includes(position)) return Math.min(100, metric(metrics,'interceptions') * 12 + metric(metrics,'passes_defended') * 3 + metric(metrics,'tackles_solo') * .35);
  return 50;
};

export class PrismaNflversePlayerProductionRepository implements INflversePlayerProductionRepository {
  public constructor(private readonly prisma: PrismaClient) {}
  public async stage(jobId: number, seasonYear: number, summaryLevel: string, records: readonly NflversePlayerProductionRecordDto[], teamId?: number): Promise<StageNflverseProductionResult> {
    const teams = await this.prisma.team.findMany({ where: teamId ? { id: teamId } : undefined, select: { id: true, abbreviation: true } });
    const teamByAbbreviation = new Map(teams.filter((t) => t.abbreviation).map((t) => [normalizeTeam(String(t.abbreviation)), t.id]));
    const rosters = await this.prisma.rosterPlayers.findMany({ where: teamId ? { teamId } : undefined, select: { id: true, teamId: true, playerName: true, position: true } });
    let staged = 0; let autoMatched = 0; let unmatched = 0;
    for (const record of records) {
      const resolvedTeamId = record.teamAbbreviation ? teamByAbbreviation.get(normalizeTeam(record.teamAbbreviation)) : undefined;
      if (teamId !== undefined && resolvedTeamId !== teamId) continue;
      const candidates = resolvedTeamId ? rosters.filter((r) => r.teamId === resolvedTeamId && normalize(r.playerName) === normalize(record.playerName)) : [];
      const exactPosition = candidates.find((r) => positionGroup(r.position) === positionGroup(record.position));
      const match = exactPosition ?? (candidates.length === 1 ? candidates[0] : undefined);
      const confidence = exactPosition ? 100 : match ? 90 : null;
      await this.prisma.nflversePlayerProductionStaging.upsert({
        where: { seasonYear_summaryLevel_externalPlayerId_teamAbbreviation: { seasonYear, summaryLevel, externalPlayerId: record.externalPlayerId, teamAbbreviation: record.teamAbbreviation ?? '' } },
        create: { importJobId: jobId, seasonYear, summaryLevel, externalPlayerId: record.externalPlayerId, playerName: record.playerName, teamAbbreviation: record.teamAbbreviation ?? '', position: record.position, positionGroup: record.positionGroup, metricsJson: record.metrics as Prisma.InputJsonObject, suggestedRosterPlayerId: match?.id, matchedRosterPlayerId: match?.id, matchConfidence: confidence, matchStatus: match ? 'AUTO_MATCHED' : 'UNMATCHED' },
        update: { importJobId: jobId, playerName: record.playerName, position: record.position, positionGroup: record.positionGroup, metricsJson: record.metrics as Prisma.InputJsonObject, suggestedRosterPlayerId: match?.id, matchedRosterPlayerId: match?.id, matchConfidence: confidence, matchStatus: match ? 'AUTO_MATCHED' : 'UNMATCHED' },
      });
      staged += 1; if (match) autoMatched += 1; else unmatched += 1;
    }
    return { staged, autoMatched, unmatched };
  }
  public async promote(seasonYear: number, stagingIds?: readonly string[]): Promise<{ promoted: number; skipped: number }> {
    const rows = await this.prisma.nflversePlayerProductionStaging.findMany({ where: { seasonYear, id: stagingIds ? { in: stagingIds.map(BigInt) } : undefined, matchStatus: { in: ['AUTO_MATCHED','CONFIRMED'] }, matchedRosterPlayerId: { not: null } } });
    let promoted = 0; let skipped = 0;
    for (const row of rows) {
      if (!row.matchedRosterPlayerId) { skipped += 1; continue; }
      const roster = await this.prisma.rosterPlayers.findUnique({ where: { id: row.matchedRosterPlayerId } });
      if (!roster) { skipped += 1; continue; }
      const evaluation = await this.prisma.playerSeasonEvaluation.upsert({
        where: { rosterPlayerId_seasonYear_sourceType_sourceName: { rosterPlayerId: roster.id, seasonYear, sourceType: 'NFLVERSE', sourceName: 'nflverse player stats' } },
        create: { rosterPlayerId: roster.id, teamId: roster.teamId, seasonYear, position: positionGroup(row.position ?? roster.position), sourceType: 'NFLVERSE', sourceName: 'nflverse player stats', sourceReference: `stats_player/${row.summaryLevel}/${seasonYear}/${row.externalPlayerId}`, metricsJson: row.metricsJson as Prisma.InputJsonValue, verified: row.matchStatus === 'CONFIRMED', effectiveAsOfDate: new Date(`${seasonYear}-12-31`) },
        update: { teamId: roster.teamId, position: positionGroup(row.position ?? roster.position), metricsJson: row.metricsJson as Prisma.InputJsonValue, verified: row.matchStatus === 'CONFIRMED', effectiveAsOfDate: new Date(`${seasonYear}-12-31`) },
      });
      await this.prisma.nflversePlayerProductionStaging.update({ where: { id: row.id }, data: { matchStatus: 'PROMOTED', promotedEvaluationId: evaluation.id } });
      promoted += 1;
    }
    return { promoted, skipped };
  }
  public async recalculateAssessments(seasonYear: number, draftYear: number, teamId?: number): Promise<{ assessmentsUpdated: number }> {
    const evaluations = await this.prisma.playerSeasonEvaluation.findMany({ where: { seasonYear, sourceType: 'NFLVERSE', teamId }, orderBy: { teamId: 'asc' } });
    const grouped = new Map<string, typeof evaluations>();
    for (const row of evaluations) { const key = `${row.teamId}:${row.position}`; grouped.set(key, [...(grouped.get(key) ?? []), row]); }
    let assessmentsUpdated = 0;
    for (const [key, rows] of grouped) {
      const [teamText, position] = key.split(':'); const resolvedTeamId = Number(teamText);
      const scores = rows.map((row) => productionScore(position, row.metricsJson)).sort((a,b) => b-a);
      const groupScore = Math.round((scores.reduce((a,b) => a+b,0) / scores.length) * 100) / 100;
      const top = scores[0] ?? 0; const second = scores[1] ?? top * .6;
      const talent = top * .45 + second * .2 + groupScore * .35;
      const need = Math.round((100 - talent) * .65 * .9 * 100) / 100;
      const priority = need >= 85 ? 1 : need >= 70 ? 2 : need >= 55 ? 3 : need >= 40 ? 4 : 5;
      await this.prisma.teamPositionAssessment.upsert({
        where: { teamId_draftYear_position_assessmentType: { teamId: resolvedTeamId, draftYear, position, assessmentType: 'AUTO_NFLVERSE' } },
        create: { teamId: resolvedTeamId, draftYear, seasonYear, position, assessmentType: 'AUTO_NFLVERSE', algorithmVersion: 'nflverse-production-v1', topStarterScore: top, secondStarterScore: second, depthQualityScore: groupScore, productionScore: groupScore, dataConfidence: 65, calculatedNeedScore: need, finalNeedScore: need, priority, reason: `Automated nflverse production assessment from ${rows.length} matched player(s).`, evidenceJson: { evaluationIds: rows.map((r) => r.id.toString()) }, status: 'RECOMMENDED' },
        update: { seasonYear, algorithmVersion: 'nflverse-production-v1', topStarterScore: top, secondStarterScore: second, depthQualityScore: groupScore, productionScore: groupScore, dataConfidence: 65, calculatedNeedScore: need, finalNeedScore: need, priority, reason: `Automated nflverse production assessment from ${rows.length} matched player(s).`, evidenceJson: { evaluationIds: rows.map((r) => r.id.toString()) }, status: 'RECOMMENDED' },
      });
      assessmentsUpdated += 1;
    }
    return { assessmentsUpdated };
  }
}
