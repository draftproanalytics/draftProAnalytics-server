import type { Prisma, PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';

const DEFAULT_CONTEXTS = [
  ['NO_TRUE_WR1', 'No credible WR1', 'The roster lacks a receiver capable of consistently functioning as the primary target.', 'WR', 90, 10],
  ['NO_PRESS_SEPARATOR', 'No reliable press-man separator', 'The receiver group lacks a player who consistently defeats press coverage without scheme assistance.', 'WR', 80, 20],
  ['NO_CONTESTED_CATCH_OPTION', 'No reliable contested-catch receiver', 'The room lacks a dependable target in traffic or at the catch point.', 'WR,TE', 70, 30],
  ['SCHEME_GENERATED_PRODUCTION', 'Production depends on scheme', 'Production appears dependent on manufactured releases, motion, or favorable alignment.', 'WR,TE,RB', 65, 40],
  ['STARTER_BELOW_REPLACEMENT', 'Starter below replacement threshold', 'The projected starter performs below an acceptable starting threshold.', 'ALL', 85, 50],
  ['FRANCHISE_PLAYER_PROTECTION', 'Weakness threatens franchise-player protection', 'The position weakness increases risk to a cornerstone player.', 'OT,IOL,TE', 95, 60],
  ['INJURY_RECOVERY_EXPOSURE', 'Injury recovery increases positional risk', 'A key player returning from injury makes this position more strategically important.', 'ALL', 80, 70],
  ['NO_STARTING_CALIBER_PLAYER', 'No starting-caliber player', 'No rostered player currently meets the starting threshold.', 'ALL', 95, 80],
  ['AGING_POSITION_CORE', 'Aging position-group core', 'The principal contributors are near or beyond the normal decline window.', 'ALL', 55, 90],
  ['DEPENDENT_ON_SINGLE_PLAYER', 'Position depends on one player', 'The position group becomes materially weak if one player is unavailable.', 'ALL', 60, 100],
] as const;

const numberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const requiredInt = (value: unknown, name: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} is required`);
  return parsed;
};

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));
const round2 = (value: number): number => Math.round(value * 100) / 100;
const jsonSafe = <T>(value: T): unknown => JSON.parse(JSON.stringify(value, (_key, item: unknown) => typeof item === 'bigint' ? item.toString() : item));

const calculateAssessment = (body: Record<string, unknown>) => {
  const strengths = [
    [numberOrNull(body.topStarterScore), 0.30],
    [numberOrNull(body.secondStarterScore), 0.15],
    [numberOrNull(body.depthQualityScore), 0.15],
    [numberOrNull(body.productionScore), 0.15],
    [numberOrNull(body.assignmentGradeScore), 0.15],
    [numberOrNull(body.roleCompletenessScore), 0.10],
  ] as const;
  let totalWeight = 0;
  let weightedStrength = 0;
  for (const [score, weight] of strengths) {
    if (score === null) continue;
    totalWeight += weight;
    weightedStrength += score * weight;
  }
  const talentStrength = totalWeight === 0 ? 50 : weightedStrength / totalWeight;
  const talentDeficiency = 100 - talentStrength;
  const contextRisk = numberOrNull(body.contextRiskScore) ?? 0;
  const rosterCountScore = numberOrNull(body.rosterCountScore) ?? 50;
  const confidence = clamp(numberOrNull(body.dataConfidence) ?? 0);
  const raw = talentDeficiency * 0.65 + contextRisk * 0.20 + (100 - rosterCountScore) * 0.10 + (100 - confidence) * 0.05;
  const calculatedNeedScore = round2(clamp(raw * (0.70 + confidence / 100 * 0.30)));
  const override = numberOrNull(body.analystOverrideScore);
  const finalNeedScore = round2(clamp(override ?? calculatedNeedScore));
  const priority = finalNeedScore >= 85 ? 1 : finalNeedScore >= 70 ? 2 : finalNeedScore >= 55 ? 3 : finalNeedScore >= 40 ? 4 : 5;
  return { calculatedNeedScore, finalNeedScore, priority };
};

export class TeamTalentController {
  public constructor(private readonly prisma: PrismaClient) {}

  public listCatalog = async (_req: Request, res: Response): Promise<void> => {
    const count = await this.prisma.teamPositionContextCatalog.count();
    if (count === 0) {
      await this.prisma.teamPositionContextCatalog.createMany({
        data: DEFAULT_CONTEXTS.map(([contextCode, displayName, description, positionScope, defaultWeight, sortOrder]) => ({
          contextCode, displayName, description, positionScope, defaultWeight, maximumWeight: 100, direction: 'INCREASE_NEED', isActive: true, sortOrder,
        })),
        skipDuplicates: true,
      });
    }
    res.json(jsonSafe(await this.prisma.teamPositionContextCatalog.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }] })));
  };

  public listRosterPlayers = async (req: Request, res: Response): Promise<void> => {
    const teamId = requiredInt(req.params.teamId, 'teamId');
    res.json(jsonSafe(await this.prisma.rosterPlayers.findMany({ where: { teamId }, orderBy: [{ position: 'asc' }, { playerName: 'asc' }] })));
  };

  public listPlayerEvaluations = async (req: Request, res: Response): Promise<void> => {
    const teamId = requiredInt(req.params.teamId, 'teamId');
    const seasonYear = requiredInt(req.query.seasonYear, 'seasonYear');
    res.json(jsonSafe(await this.prisma.playerSeasonEvaluation.findMany({ where: { teamId, seasonYear }, orderBy: [{ position: 'asc' }, { positionRank: 'asc' }] })));
  };

  public savePlayerEvaluation = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Record<string, unknown>;
    const id = numberOrNull(body.id);
    const data = {
      rosterPlayerId: String(body.rosterPlayerId ?? ''),
      teamId: requiredInt(body.teamId, 'teamId'),
      seasonYear: requiredInt(body.seasonYear, 'seasonYear'),
      position: String(body.position ?? '').toUpperCase(),
      sourceType: String(body.sourceType ?? 'MANUAL_ANALYST'),
      sourceName: String(body.sourceName ?? 'DPA Analyst'),
      sourceReference: body.sourceReference ? String(body.sourceReference) : null,
      overallGrade: numberOrNull(body.overallGrade), positionRank: numberOrNull(body.positionRank), qualifyingPlayerCount: numberOrNull(body.qualifyingPlayerCount),
      passBlockGrade: numberOrNull(body.passBlockGrade), runBlockGrade: numberOrNull(body.runBlockGrade), receivingGrade: numberOrNull(body.receivingGrade), coverageGrade: numberOrNull(body.coverageGrade), passRushGrade: numberOrNull(body.passRushGrade),
      metricsJson: (body.metricsJson ?? undefined) as Prisma.InputJsonValue | undefined,
      analystContextJson: (body.analystContextJson ?? undefined) as Prisma.InputJsonValue | undefined,
      verified: Boolean(body.verified), verifiedByPersonId: numberOrNull(body.verifiedByPersonId), verifiedAt: body.verified ? new Date() : null,
      effectiveAsOfDate: new Date(String(body.effectiveAsOfDate)),
    };
    const saved = id === null
      ? await this.prisma.playerSeasonEvaluation.create({ data })
      : await this.prisma.playerSeasonEvaluation.update({ where: { id: BigInt(id) }, data });
    res.json(jsonSafe(saved));
  };

  public deletePlayerEvaluation = async (req: Request, res: Response): Promise<void> => {
    await this.prisma.playerSeasonEvaluation.delete({ where: { id: BigInt(requiredInt(req.params.id, 'id')) } });
    res.status(204).send();
  };

  public listContexts = async (req: Request, res: Response): Promise<void> => {
    const teamId = requiredInt(req.params.teamId, 'teamId');
    const draftYear = requiredInt(req.query.draftYear, 'draftYear');
    res.json(jsonSafe(await this.prisma.teamPositionContext.findMany({ where: { teamId, draftYear }, include: { TeamPositionContextCatalog: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] })));
  };

  public saveContext = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Record<string, unknown>;
    const id = numberOrNull(body.id);
    const catalogId = numberOrNull(body.contextCatalogId);
    const catalog = catalogId === null ? null : await this.prisma.teamPositionContextCatalog.findUnique({ where: { id: catalogId } });
    const appliedWeight = numberOrNull(body.appliedWeight) ?? Number(catalog?.defaultWeight ?? 0);
    const confidence = numberOrNull(body.analystConfidence) ?? 100;
    const contextScore = round2(clamp(appliedWeight * confidence / 100));
    const data = {
      teamId: requiredInt(body.teamId, 'teamId'), draftYear: requiredInt(body.draftYear, 'draftYear'), position: String(body.position ?? '').toUpperCase(),
      riskLevel: String(body.riskLevel ?? (contextScore >= 80 ? 'CRITICAL' : contextScore >= 60 ? 'HIGH' : 'MEDIUM')),
      contextScore, contextType: catalog?.contextCode ?? String(body.contextType ?? 'MANUAL_CONTEXT'), summary: String(body.summary ?? catalog?.displayName ?? ''),
      evidenceJson: (body.evidenceJson ?? undefined) as Prisma.InputJsonValue | undefined, source: String(body.source ?? 'MANUAL'), status: String(body.status ?? 'APPROVED'),
      contextCatalogId: catalogId, appliedWeight, analystConfidence: confidence, createdByPersonId: numberOrNull(body.createdByPersonId),
    };
    const saved = id === null ? await this.prisma.teamPositionContext.create({ data }) : await this.prisma.teamPositionContext.update({ where: { id: BigInt(id) }, data });
    res.json(jsonSafe(saved));
  };

  public deleteContext = async (req: Request, res: Response): Promise<void> => {
    await this.prisma.teamPositionContext.delete({ where: { id: BigInt(requiredInt(req.params.id, 'id')) } });
    res.status(204).send();
  };

  public listAssessments = async (req: Request, res: Response): Promise<void> => {
    const teamId = requiredInt(req.params.teamId, 'teamId');
    const draftYear = requiredInt(req.query.draftYear, 'draftYear');
    res.json(jsonSafe(await this.prisma.teamPositionAssessment.findMany({ where: { teamId, draftYear }, orderBy: { position: 'asc' } })));
  };

  public saveAssessment = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Record<string, unknown>;
    const id = numberOrNull(body.id);
    const calculated = calculateAssessment(body);
    const data = {
      teamId: requiredInt(body.teamId, 'teamId'), draftYear: requiredInt(body.draftYear, 'draftYear'), seasonYear: requiredInt(body.seasonYear, 'seasonYear'),
      position: String(body.position ?? '').toUpperCase(), assessmentType: String(body.assessmentType ?? 'MANUAL'), algorithmVersion: String(body.algorithmVersion ?? 'team-needs-v4'),
      rosterCountScore: numberOrNull(body.rosterCountScore), topStarterScore: numberOrNull(body.topStarterScore), secondStarterScore: numberOrNull(body.secondStarterScore), depthQualityScore: numberOrNull(body.depthQualityScore), productionScore: numberOrNull(body.productionScore), assignmentGradeScore: numberOrNull(body.assignmentGradeScore), roleCompletenessScore: numberOrNull(body.roleCompletenessScore), contextRiskScore: numberOrNull(body.contextRiskScore), dataConfidence: numberOrNull(body.dataConfidence) ?? 0,
      calculatedNeedScore: calculated.calculatedNeedScore, analystOverrideScore: numberOrNull(body.analystOverrideScore), finalNeedScore: calculated.finalNeedScore, priority: calculated.priority,
      reason: body.reason ? String(body.reason) : null, evidenceJson: (body.evidenceJson ?? undefined) as Prisma.InputJsonValue | undefined, inputSnapshotJson: (body.inputSnapshotJson ?? undefined) as Prisma.InputJsonValue | undefined,
      status: String(body.status ?? 'APPROVED'), createdByPersonId: numberOrNull(body.createdByPersonId), reviewedByPersonId: numberOrNull(body.reviewedByPersonId), reviewedAt: body.reviewedByPersonId ? new Date() : null,
    };
    const saved = id === null ? await this.prisma.teamPositionAssessment.create({ data }) : await this.prisma.teamPositionAssessment.update({ where: { id: BigInt(id) }, data });
    res.json(jsonSafe(saved));
  };

  public deleteAssessment = async (req: Request, res: Response): Promise<void> => {
    await this.prisma.teamPositionAssessment.delete({ where: { id: BigInt(requiredInt(req.params.id, 'id')) } });
    res.status(204).send();
  };
}
