import type { Prisma } from '@prisma/client';
import type { JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type { GenerateTeamNeedsResultDto } from '../../domain/dtos/GenerateTeamNeeds.dto';
import type { IJobQueueRepository } from '../../domain/repositories/IJobQueueRepository';
import type {
  GeneratedTeamNeedRecord,
  ITeamNeedsGenerationRepository,
  TeamNeedsGenerationRosterPlayer,
} from '../../domain/repositories/ITeamNeedsGenerationRepository';
import { readGenerateTeamNeedsPayload } from './DpaJobPayloadGuards';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OT', 'IOL', 'EDGE', 'DT', 'LB', 'CB', 'S', 'K', 'P'] as const;
type CanonicalPosition = (typeof POSITIONS)[number];

interface NormalizedRosterPlayer extends TeamNeedsGenerationRosterPlayer {
  readonly position: CanonicalPosition;
  readonly positionGroup: CanonicalPosition;
}

interface LeaguePositionBaseline {
  readonly lowerQuartile: number;
  readonly median: number;
  readonly maximum: number;
}

const normalizeCandidate = (rawValue: string): CanonicalPosition | null => {
  const value = rawValue.trim().toUpperCase();
  if (value === '') return null;

  if (value === 'QB' || value.includes('QUARTERBACK')) return 'QB';
  if (['RB', 'FB'].includes(value) || value.includes('RUNNING BACK') || value.includes('FULLBACK')) return 'RB';
  if (value === 'WR' || value.includes('WIDE RECEIVER')) return 'WR';
  if (value === 'TE' || value.includes('TIGHT END')) return 'TE';
  if (['OT', 'T'].includes(value) || value.includes('OFFENSIVE TACKLE')) return 'OT';
  if (
    ['C', 'G', 'OG', 'OL', 'IOL'].includes(value)
    || value.includes('CENTER')
    || value.includes('OFFENSIVE GUARD')
    || value.includes('INTERIOR OFFENSIVE')
  ) return 'IOL';
  if (['DE', 'EDGE'].includes(value) || value.includes('DEFENSIVE END') || value.includes('EDGE RUSHER')) return 'EDGE';
  if (['DT', 'NT', 'DL'].includes(value) || value.includes('DEFENSIVE TACKLE') || value.includes('NOSE TACKLE')) return 'DT';
  if (value === 'LB' || value.includes('LINEBACKER')) return 'LB';
  if (value === 'CB' || value.includes('CORNERBACK')) return 'CB';
  if (['S', 'FS', 'SS'].includes(value) || value.includes('SAFETY')) return 'S';
  if (['K', 'PK'].includes(value) || value.includes('KICKER')) return 'K';
  if (value === 'P' || value.includes('PUNTER')) return 'P';

  return null;
};

const normalizePosition = (
  position: string,
  positionGroup: string,
): CanonicalPosition | null => normalizeCandidate(position) ?? normalizeCandidate(positionGroup);

const quantile = (values: readonly number[], percentile: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  if (lowerIndex === upperIndex) return sorted[lowerIndex] ?? 0;
  const lower = sorted[lowerIndex] ?? 0;
  const upper = sorted[upperIndex] ?? lower;
  return lower + ((upper - lower) * (index - lowerIndex));
};

const roundToTwo = (value: number): number => Math.round(value * 100) / 100;

const priorityFromNeedScore = (needScore: number): number | null => {
  if (needScore >= 85) return 1;
  if (needScore >= 70) return 2;
  if (needScore >= 55) return 3;
  if (needScore >= 40) return 4;
  return null;
};

const calculateRelativeNeedScore = (
  position: CanonicalPosition,
  rosterCount: number,
  baseline: LeaguePositionBaseline,
): number => {
  if (position === 'K' || position === 'P') {
    return rosterCount === 0 ? 95 : 0;
  }

  if (rosterCount === 0) return 95;

  if (rosterCount < baseline.lowerQuartile) {
    const denominator = Math.max(1, baseline.lowerQuartile);
    const shortageRatio = (baseline.lowerQuartile - rosterCount) / denominator;
    return roundToTwo(Math.min(90, 72 + (shortageRatio * 18)));
  }

  if (baseline.lowerQuartile < baseline.median && rosterCount === baseline.lowerQuartile) {
    return 58;
  }

  return 0;
};

export class GenerateTeamNeedsJobHandler {
  public constructor(
    private readonly jobs: IJobQueueRepository,
    private readonly repository: ITeamNeedsGenerationRepository,
  ) {}

  public async execute(job: JobSummaryDto): Promise<void> {
    const payload = readGenerateTeamNeedsPayload(job.payload);
    const allTeamIds = await this.repository.listTeamIds();
    const targetTeamIds = payload.teamId === undefined
      ? allTeamIds
      : allTeamIds.filter((teamId) => teamId === payload.teamId);

    if (targetTeamIds.length === 0) {
      throw new Error(payload.teamId ? `Team ${payload.teamId} was not found.` : 'No teams were found.');
    }

    const normalizedRosters = new Map<number, readonly NormalizedRosterPlayer[]>();
    const unrecognizedValues = new Map<number, Set<string>>();

    for (const teamId of allTeamIds) {
      const roster = await this.repository.loadRoster(teamId);
      const unknown = new Set<string>();
      const normalized = roster.flatMap((player): readonly NormalizedRosterPlayer[] => {
        const canonical = normalizePosition(player.position, player.positionGroup);
        if (canonical === null) {
          unknown.add(`${player.position}/${player.positionGroup}`);
          return [];
        }
        return [{ ...player, position: canonical, positionGroup: canonical }];
      });
      normalizedRosters.set(teamId, normalized);
      unrecognizedValues.set(teamId, unknown);
    }

    const leagueBaselines = new Map<CanonicalPosition, LeaguePositionBaseline>();
    for (const position of POSITIONS) {
      const counts = allTeamIds.map((teamId) => (
        normalizedRosters.get(teamId)?.filter((player) => player.position === position).length ?? 0
      ));
      leagueBaselines.set(position, {
        lowerQuartile: roundToTwo(quantile(counts, 0.25)),
        median: roundToTwo(quantile(counts, 0.5)),
        maximum: Math.max(...counts, 0),
      });
    }

    const stepId = await this.jobs.createJobStep({
      jobId: job.id,
      stepName: 'GENERATE_TEAM_NEEDS',
      sortOrder: 1,
      totalItems: targetTeamIds.length,
    });
    await this.jobs.markStepRunning(stepId);
    await this.jobs.updateJobProgress({
      jobId: job.id,
      progressPercent: 0,
      totalItems: targetTeamIds.length,
      processedItems: 0,
    });

    let teamsProcessed = 0;
    let teamsSkipped = 0;
    let recommendationsCreated = 0;
    let recommendationsUpdated = 0;
    let protectedRowsPreserved = 0;
    let recommendationsRemoved = 0;
    const warnings: Array<{ teamId: number; code: string; message: string }> = [];

    for (const teamId of targetTeamIds) {
      const roster = normalizedRosters.get(teamId) ?? [];
      if (roster.length === 0) {
        teamsSkipped += 1;
        warnings.push({ teamId, code: 'NO_USABLE_ROSTER_DATA', message: 'No recognizable rosterPlayers rows were found.' });
      } else {
        const unknown = unrecognizedValues.get(teamId);
        if (unknown && unknown.size > 0) {
          warnings.push({
            teamId,
            code: 'UNRECOGNIZED_POSITION_VALUES',
            message: `Skipped roster position values: ${[...unknown].sort().join(', ')}`,
          });
        }

        const records: GeneratedTeamNeedRecord[] = [];
        const talentInputs = await this.repository.loadTalentInputs(teamId, payload.draftYear);
        const talentByPosition = new Map(talentInputs.map((input) => [input.position, input]));
        for (const position of POSITIONS) {
          const rosterCount = roster.filter((player) => player.position === position).length;
          const baseline = leagueBaselines.get(position) ?? { lowerQuartile: 0, median: 0, maximum: 0 };
          const rosterNeedScore = calculateRelativeNeedScore(position, rosterCount, baseline);
          const talent = talentByPosition.get(position);
          const needScore = talent?.finalNeedScore ?? rosterNeedScore;
          const priority = talent?.priority ?? priorityFromNeedScore(needScore);
          if (priority === null || priority > 4) continue;

          const reasons: string[] = [];
          if (talent?.reason) reasons.push(talent.reason);
          if (talent) {
            reasons.push(`Talent-aware assessment applied with ${talent.contextCount} context judgment${talent.contextCount === 1 ? '' : 's'}.`);
          } else if (rosterCount === 0) {
            reasons.push(`No rostered ${position} players were found.`);
          } else {
            reasons.push(`${rosterCount} rostered ${position} player${rosterCount === 1 ? '' : 's'}; league lower quartile is ${baseline.lowerQuartile} and median is ${baseline.median}.`);
          }

          records.push({
            teamId,
            draftYear: payload.draftYear,
            position,
            priority,
            needScore,
            asOfDate: new Date(`${payload.asOfDate}T00:00:00.000Z`),
            algorithmVersion: payload.algorithmVersion,
            rationaleJson: reasons as unknown as Prisma.InputJsonArray,
            inputSnapshotJson: {
              rosterCount,
              leagueLowerQuartile: baseline.lowerQuartile,
              leagueMedian: baseline.median,
              leagueMaximum: baseline.maximum,
              methodology: talent ? 'TALENT_AWARE_POSITION_ASSESSMENT' : 'LEAGUE_RELATIVE_ROSTER_COUNT',
              assessmentId: talent?.assessmentId,
              talentComponents: talent ? {
                rosterCountScore: talent.rosterCountScore,
                topStarterScore: talent.topStarterScore,
                secondStarterScore: talent.secondStarterScore,
                depthQualityScore: talent.depthQualityScore,
                productionScore: talent.productionScore,
                assignmentGradeScore: talent.assignmentGradeScore,
                roleCompletenessScore: talent.roleCompletenessScore,
                contextRiskScore: talent.contextRiskScore,
                dataConfidence: talent.dataConfidence,
              } : undefined,
              ignoredPlaceholderInputs: ['performanceGrade', 'contractYearsRemaining', 'isStarter', 'injuryStatus'],
              confidence: talent ? talent.dataConfidence ?? 0 : 'LOW',
            } as Prisma.InputJsonObject,
            generatedByJobId: job.id,
          });
        }

        const persisted = await this.repository.persistRecommendations(
          teamId,
          payload.draftYear,
          records,
          payload.replaceRecommendations,
        );
        recommendationsCreated += persisted.created;
        recommendationsUpdated += persisted.updated;
        protectedRowsPreserved += persisted.preserved;
        recommendationsRemoved += persisted.removed;
        teamsProcessed += 1;
      }

      const processedItems = teamsProcessed + teamsSkipped;
      await this.jobs.updateJobProgress({
        jobId: job.id,
        progressPercent: Math.round((processedItems / targetTeamIds.length) * 100),
        totalItems: targetTeamIds.length,
        processedItems,
      });
    }

    const result: GenerateTeamNeedsResultDto = {
      draftYear: payload.draftYear,
      teamsRequested: targetTeamIds.length,
      teamsProcessed,
      teamsSkipped,
      recommendationsCreated,
      recommendationsUpdated,
      protectedRowsPreserved,
      recommendationsRemoved,
      warnings,
    };
    await this.jobs.completeStep(stepId, result as unknown as Prisma.InputJsonObject);
    await this.jobs.completeJob({
      jobId: job.id,
      resultCode: warnings.length > 0 ? 'TEAM_NEEDS_GENERATED_WITH_WARNINGS' : 'TEAM_NEEDS_GENERATED',
      resultJson: result as unknown as Prisma.InputJsonObject,
    });
  }
}
