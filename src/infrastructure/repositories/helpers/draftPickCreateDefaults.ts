import { PrismaClient } from '@prisma/client';

export interface DraftPickCreateDefaults {
  draftEventId: number;
  pickInRound: number;
}

export const resolveDraftPickCreateDefaults = async (
  prisma: PrismaClient,
  draftYear: number,
  round: number,
): Promise<DraftPickCreateDefaults> => {
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
      status: 'PLANNED',
    },
  });

  const latestPickInRound = await prisma.draftPick.findFirst({
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
    pickInRound:
      latestPickInRound === null ? 1 : latestPickInRound.pickInRound + 1,
  };
};