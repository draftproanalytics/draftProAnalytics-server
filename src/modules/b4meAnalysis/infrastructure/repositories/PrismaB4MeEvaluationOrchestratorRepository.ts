import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  CreateStoredB4MeEvaluationInput,
  IB4MeEvaluationOrchestratorRepository,
  StoredB4MeEvaluationRecord
} from '../../domain/repositories/IB4MeEvaluationOrchestratorRepository';
import type { B4MeScoringMode } from '../../domain/enums/B4MeScoringMode';

function toJsonObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function mapToRvaScoringMode(
  scoringMode: B4MeScoringMode
): 'BASE_ONLY' | 'BASE_PLUS_CONTEXT' | 'FULL_DECISION_VIEW' {
  if (scoringMode === 'FULL_DECISION_SCORE') {
    return 'FULL_DECISION_VIEW';
  }

  return scoringMode;
}

export class PrismaB4MeEvaluationOrchestratorRepository
  implements IB4MeEvaluationOrchestratorRepository
{
  public constructor(private readonly prisma: PrismaClient) {}

  public async findStoredWrEvaluation(
    evaluationKey: string
  ): Promise<StoredB4MeEvaluationRecord | null> {
    const row = await this.prisma.b4MeProspectEvaluation.findUnique({
      where: {
        evaluationKey
      }
    });

    if (!row) {
      return null;
    }

    const flagsJson: Record<string, unknown> = toJsonObject(row.flagsJson) ?? {};
    const scoresJson: Record<string, unknown> = toJsonObject(row.scoresJson) ?? {};

    return {
      id: row.id,
      prospectId: row.prospectId,
      playerName: row.playerName,
      school: row.school,
      draftYear: row.draftYear,
      positionGroup: row.positionGroup,
      frameworkVersion: row.frameworkVersion,
      scoringMode: row.scoringMode as B4MeScoringMode,
      rawMetricsJson: toJsonObject(row.rawMetricsJson) ?? {},
      baseScoringJson: toJsonObject(row.baseScoringJson) ?? {},
      modifiersJson: toJsonObject(row.modifiersJson) ?? {},
      coachabilityJson: toJsonObject(row.coachabilityJson) ?? {},
      rfaJson: toJsonObject(row.rfaJson) ?? {},
      flagsJson,
      scoresJson,
      optionalFiltersJson: toJsonObject(row.optionalFiltersJson) ?? {},
      methodologySnapshotJson: toJsonObject(row.methodologySnapshotJson),
      scoreExplanation: row.scoreExplanation,
      projectionNote: row.projectionNote,
      decisionTraceJson: toJsonObject(row.decisionTraceJson),
      activeFilterSummaryJson: toJsonObject(row.activeFilterSummaryJson),
      optionalTeamContextJson: toJsonObject(row.optionalTeamContextJson),
      keyFlag: typeof flagsJson.keyFlag === 'string' ? flagsJson.keyFlag : null,
      contactArchetype: row.contactArchetype,
      coachabilityTier: row.coachabilityTier,
      pressManSurvivability: row.pressManSurvivability,
      rfaTier: row.rfaTier,
      rvaTier: row.rvaTier,
      finalB4MeScore:
        row.finalB4MeScore !== null ? Number(row.finalB4MeScore) : null,
      rvaPlaceholderScore:
        row.rvaPlaceholderScore !== null ? Number(row.rvaPlaceholderScore) : null
    };
  }

  public async createStoredWrEvaluation(
    input: CreateStoredB4MeEvaluationInput
  ): Promise<StoredB4MeEvaluationRecord> {
    await this.prisma.$transaction(async (tx) => {
      const evaluation = await tx.b4MeProspectEvaluation.upsert({
        where: {
          evaluationKey: input.evaluationKey
        },
        update: {
          prospectId: input.prospectId,
          positionGroup: 'WR',
          draftYear: input.draftYear,
          playerName: input.playerName,
          school: input.school,
          contactArchetype: input.computed.modifiers.contactArchetype,
          frameworkVersion: input.frameworkVersion,
          frameworkCatalogId: input.frameworkCatalogId,
          scoringMode: input.scoringMode,
          rawMetricsJson: toInputJson(input.computed.rawMetrics),
          baseScoringJson: toInputJson(input.computed.base),
          modifiersJson: toInputJson(input.computed.modifiers),
          coachabilityJson: toInputJson(input.computed.coachability),
          rfaJson: toInputJson(input.computed.rfa),
          flagsJson: toInputJson({
            keyFlag: input.computed.modifiers.keyFlag,
            projectionNote: input.computed.projectionNote
          }),
          scoresJson: toInputJson({
            finalB4MeScore: input.computed.finalB4MeScore,
            finalRvaScore: input.computed.rva.finalRvaScore
          }),
          optionalFiltersJson: toInputJson(input.computed.optionalFilters),
          methodologySnapshotJson:
            input.methodologySnapshotJson !== null
              ? toInputJson(input.methodologySnapshotJson)
              : Prisma.JsonNull,
          scoreExplanation: input.computed.scoreExplanation,
          projectionNote: input.computed.projectionNote,
          decisionTraceJson: toInputJson(input.computed.decisionTrace),
          activeFilterSummaryJson: toInputJson(input.activeFilterSummaryJson),
          optionalTeamContextJson:
            input.optionalTeamContextJson !== null
              ? toInputJson(input.optionalTeamContextJson)
              : Prisma.JsonNull,
          keyFlag: input.computed.modifiers.keyFlag,
          coachabilityTier: input.computed.coachability.tier,
          pressManSurvivability: input.computed.coachability.pressManSurvivability,
          rfaTier: input.computed.rfa.tier,
          rvaTier: input.computed.rva.tier,
          finalB4MeScore: input.computed.finalB4MeScore,
          rvaPlaceholderScore: input.computed.rva.finalRvaScore,
          computedAt: new Date()
        },
        create: {
          prospectId: input.prospectId,
          positionGroup: 'WR',
          draftYear: input.draftYear,
          playerName: input.playerName,
          school: input.school,
          contactArchetype: input.computed.modifiers.contactArchetype,
          frameworkVersion: input.frameworkVersion,
          frameworkCatalogId: input.frameworkCatalogId,
          scoringMode: input.scoringMode,
          evaluationKey: input.evaluationKey,
          rawMetricsJson: toInputJson(input.computed.rawMetrics),
          baseScoringJson: toInputJson(input.computed.base),
          modifiersJson: toInputJson(input.computed.modifiers),
          coachabilityJson: toInputJson(input.computed.coachability),
          rfaJson: toInputJson(input.computed.rfa),
          flagsJson: toInputJson({
            keyFlag: input.computed.modifiers.keyFlag,
            projectionNote: input.computed.projectionNote
          }),
          scoresJson: toInputJson({
            finalB4MeScore: input.computed.finalB4MeScore,
            finalRvaScore: input.computed.rva.finalRvaScore
          }),
          optionalFiltersJson: toInputJson(input.computed.optionalFilters),
          methodologySnapshotJson:
            input.methodologySnapshotJson !== null
              ? toInputJson(input.methodologySnapshotJson)
              : Prisma.JsonNull,
          scoreExplanation: input.computed.scoreExplanation,
          projectionNote: input.computed.projectionNote,
          decisionTraceJson: toInputJson(input.computed.decisionTrace),
          activeFilterSummaryJson: toInputJson(input.activeFilterSummaryJson),
          optionalTeamContextJson:
            input.optionalTeamContextJson !== null
              ? toInputJson(input.optionalTeamContextJson)
              : Prisma.JsonNull,
          keyFlag: input.computed.modifiers.keyFlag,
          coachabilityTier: input.computed.coachability.tier,
          pressManSurvivability: input.computed.coachability.pressManSurvivability,
          rfaTier: input.computed.rfa.tier,
          rvaTier: input.computed.rva.tier,
          finalB4MeScore: input.computed.finalB4MeScore,
          rvaPlaceholderScore: input.computed.rva.finalRvaScore,
          computedAt: new Date()
        }
      });

      await tx.b4MeEvaluationMetadata.upsert({
        where: {
          prospectEvaluationId_frameworkCatalogId: {
            prospectEvaluationId: evaluation.id,
            frameworkCatalogId: input.frameworkCatalogId ?? BigInt(0)
          }
        },
        update: {
          scoringModeUsed: input.scoringMode,
          evaluationNotes: input.computed.scoreExplanation,
          validationStatus: 'UNVALIDATED',
          activeFilterSummary: toInputJson(input.activeFilterSummaryJson),
          methodologySnapshot:
            input.methodologySnapshotJson !== null
              ? toInputJson(input.methodologySnapshotJson)
              : Prisma.JsonNull,
          futureTeamContext:
            input.optionalTeamContextJson !== null
              ? toInputJson(input.optionalTeamContextJson)
              : Prisma.JsonNull
        },
        create: {
          prospectEvaluationId: evaluation.id,
          frameworkCatalogId: input.frameworkCatalogId ?? BigInt(0),
          scoringModeUsed: input.scoringMode,
          evaluationNotes: input.computed.scoreExplanation,
          validationStatus: 'UNVALIDATED',
          activeFilterSummary: toInputJson(input.activeFilterSummaryJson),
          methodologySnapshot:
            input.methodologySnapshotJson !== null
              ? toInputJson(input.methodologySnapshotJson)
              : Prisma.JsonNull,
          futureTeamContext:
            input.optionalTeamContextJson !== null
              ? toInputJson(input.optionalTeamContextJson)
              : Prisma.JsonNull
        }
      });

      await tx.b4MeProspectRvaEvaluation.upsert({
        where: {
          prospectId_scoringMode: {
            prospectId: input.prospectId,
            scoringMode: mapToRvaScoringMode(input.scoringMode)
          }
        },
        update: {
          prospectEvaluationId: evaluation.id,
          finalB4MeScore: input.computed.finalB4MeScore,
          rvaTalent: input.computed.rva.talent,
          rvaFit: input.computed.rva.fit,
          rvaDurability: input.computed.rva.durability,
          rvaRoleUtility: input.computed.rva.roleUtility,
          rvaCostEfficiency: input.computed.rva.costEfficiency,
          rvaOpportunityCost: input.computed.rva.opportunityCost,
          finalRvaScore: input.computed.rva.finalRvaScore,
          competitionDiscountApplied: input.computed.optionalFilters.competitionDelta < 0,
          injurySampleWarning: input.computed.optionalFilters.injuryDelta < 0,
          summary: input.computed.rva.summary,
          keyFlag: input.computed.modifiers.keyFlag,
          draftValueInterpretation: input.computed.rva.draftValueInterpretation,
          opportunityCostSummary: input.computed.rva.opportunityCostSummary,
          availabilitySummary: input.computed.rva.availabilitySummary,
          injuryHistorySummary: input.computed.rva.injuryHistorySummary,
          acquisitionCostSummary: input.computed.rva.acquisitionCostSummary,
          repeatExpenditureRisk: input.computed.rva.repeatExpenditureRisk
        },
        create: {
          prospectId: input.prospectId,
          prospectEvaluationId: evaluation.id,
          scoringMode: mapToRvaScoringMode(input.scoringMode),
          finalB4MeScore: input.computed.finalB4MeScore,
          rvaTalent: input.computed.rva.talent,
          rvaFit: input.computed.rva.fit,
          rvaDurability: input.computed.rva.durability,
          rvaRoleUtility: input.computed.rva.roleUtility,
          rvaCostEfficiency: input.computed.rva.costEfficiency,
          rvaOpportunityCost: input.computed.rva.opportunityCost,
          finalRvaScore: input.computed.rva.finalRvaScore,
          competitionDiscountApplied: input.computed.optionalFilters.competitionDelta < 0,
          injurySampleWarning: input.computed.optionalFilters.injuryDelta < 0,
          summary: input.computed.rva.summary,
          keyFlag: input.computed.modifiers.keyFlag,
          draftValueInterpretation: input.computed.rva.draftValueInterpretation,
          opportunityCostSummary: input.computed.rva.opportunityCostSummary,
          availabilitySummary: input.computed.rva.availabilitySummary,
          injuryHistorySummary: input.computed.rva.injuryHistorySummary,
          acquisitionCostSummary: input.computed.rva.acquisitionCostSummary,
          repeatExpenditureRisk: input.computed.rva.repeatExpenditureRisk
        }
      });
    });

    const stored = await this.findStoredWrEvaluation(input.evaluationKey);

    if (!stored) {
      throw new Error('Stored WR evaluation could not be reloaded after creation.');
    }

    return stored;
  }
  public async deleteStoredWrEvaluationsForProspect(prospectId: number): Promise<void> {
    await this.prisma.b4MeProspectEvaluation.deleteMany({
      where: { prospectId, positionGroup: 'WR' }
    });
  }

}