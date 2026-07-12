import { DraftEvent_status, PrismaClient } from '@prisma/client';

export interface ResolvedDraftPickDefaults {
  draftEventId: number;
  pickInRound: number;
}

export const resolveDraftPickDefaults = async (
  prisma: PrismaClient,
  draftYear: number,
  round: number,
  requestedPickInRound?: number | null,
): Promise<ResolvedDraftPickDefaults> => {
  const draftEvent = await prisma.draftEvent.upsert({
    where: {
      draftYear_leagueCode: {
        draftYear,
        leagueCode: 'NFL',
      },
    },
    update: {},
    create: {
      draftYear,
      leagueCode: 'NFL',
      name: `${draftYear} NFL Draft`,
      status: DraftEvent_status.PLANNED,
    },
  });

  if (requestedPickInRound !== undefined && requestedPickInRound !== null && requestedPickInRound > 0) {
    return {
      draftEventId: draftEvent.id,
      pickInRound: requestedPickInRound,
    };
  }

  const latest = await prisma.draftPick.findFirst({
    where: {
      draftEventId: draftEvent.id,
      round,
    },
    orderBy: {
      pickInRound: 'desc',
    },
    select: {
      pickInRound: true,
    },
  });

  return {
    draftEventId: draftEvent.id,
    pickInRound: latest === null ? 1 : latest.pickInRound + 1,
  };
};