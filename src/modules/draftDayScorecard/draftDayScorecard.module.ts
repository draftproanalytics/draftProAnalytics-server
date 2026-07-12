import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { createDraftDayScorecardRouter } from './presentation/routes/draftDayScorecard.routes';
//import { prisma as prismaClient } from '@/infrastructure/database/prisma';

export const createDraftDayScorecardModule = (
  prisma: PrismaClient,
): Router => {
    return createDraftDayScorecardRouter(prisma);
};