import { prisma } from '@/infrastructure/database/prisma';
import { NotFoundError } from '@/shared/errors/AppError';

export interface ProspectProfileDto {
  prospect: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    position: string;
    college: string;
    homeCity: string | null;
    homeState: string | null;
    drafted: boolean;
    draftStatus: 'PRE_DRAFT' | 'DRAFTED' | 'UDFA';
    draftYear: number | null;
    teamId: number | null;
    draftPickId: number | null;
  };
  combine: {
    id: number | null;
    height: number | null;
    weight: number | null;
    handSize: number | null;
    armLength: number | null;
    fortyTime: number | null;
    tenYardSplit: number | null;
    twentyYardShuttle: number | null;
    threeCone: number | null;
    verticalLeap: number | null;
    broadJump: number | null;
    benchPress: number | null;
    source: 'COMBINE_SCORE' | 'NONE';
  };
  rankings: Array<{ source: string; overallRank: number; positionRank: number | null; grade: number | null }>;
  b4me: {
    scoringMode: string;
    coachabilityTier: string | null;
    rfaTier: string | null;
    rvaTier: string | null;
    finalB4MeScore: number | null;
    computedAt: Date;
  } | null;
  draftHistory: Array<{
    id: number;
    draftYear: number;
    round: number;
    pickInRound: number;
    pickNumber: number;
    status: string;
    currentTeamId: number;
    selectedAt: Date | null;
  }>;
}

export class ProspectProfileQueryService {
  async getProspectProfile(id: number): Promise<ProspectProfileDto> {
    const prospect = await prisma.prospect.findUnique({
      where: { id },
      include: {
        CombineScore: true,
        ProspectRanking: { orderBy: [{ source: 'asc' }, { overallRank: 'asc' }] },
        DraftPick_DraftPick_prospectIdToProspect: { orderBy: [{ draftYear: 'desc' }, { pickNumber: 'asc' }] },
      },
    });
    if (!prospect) throw new NotFoundError('Prospect', id);

    const b4me = await prisma.b4MeProspectEvaluation.findFirst({
      where: { prospectId: id },
      orderBy: { computedAt: 'desc' },
      select: {
        scoringMode: true,
        coachabilityTier: true,
        rfaTier: true,
        rvaTier: true,
        finalB4MeScore: true,
        computedAt: true,
      },
    });

    const combine = prospect.CombineScore;
    return {
      prospect: {
        id: prospect.id,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        fullName: `${prospect.firstName} ${prospect.lastName}`.trim(),
        position: prospect.position,
        college: prospect.college,
        homeCity: prospect.homeCity,
        homeState: prospect.homeState,
        drafted: prospect.drafted,
        draftStatus: prospect.draftStatus,
        draftYear: prospect.draftYear,
        teamId: prospect.teamId,
        draftPickId: prospect.draftPickId,
      },
      combine: {
        id: combine?.id ?? null,
        height: combine?.height ?? null,
        weight: combine?.weight ?? null,
        handSize: combine?.handSize ?? null,
        armLength: combine?.armLength ?? null,
        fortyTime: combine?.fortyTime ?? null,
        tenYardSplit: combine?.tenYardSplit ?? null,
        twentyYardShuttle: combine?.twentyYardShuttle ?? null,
        threeCone: combine?.threeCone ?? null,
        verticalLeap: combine?.verticalLeap ?? null,
        broadJump: combine?.broadJump ?? null,
        benchPress: combine?.benchPress ?? null,
        source: combine ? 'COMBINE_SCORE' : 'NONE',
      },
      rankings: prospect.ProspectRanking.map((ranking) => ({
        source: ranking.source,
        overallRank: ranking.overallRank,
        positionRank: ranking.positionRank,
        grade: ranking.grade === null ? null : Number(ranking.grade),
      })),
      b4me: b4me ? {
        scoringMode: b4me.scoringMode,
        coachabilityTier: b4me.coachabilityTier,
        rfaTier: b4me.rfaTier,
        rvaTier: b4me.rvaTier,
        finalB4MeScore: b4me.finalB4MeScore === null ? null : Number(b4me.finalB4MeScore),
        computedAt: b4me.computedAt,
      } : null,
      draftHistory: prospect.DraftPick_DraftPick_prospectIdToProspect.map((pick) => ({
        id: pick.id,
        draftYear: pick.draftYear,
        round: pick.round,
        pickInRound: pick.pickInRound,
        pickNumber: pick.pickNumber,
        status: pick.status,
        currentTeamId: pick.currentTeamId,
        selectedAt: pick.selectedAt,
      })),
    };
  }
}
