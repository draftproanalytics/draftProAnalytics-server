import { Router } from 'express';
import { DraftDayScorecardController } from '../controllers/DraftDayScorecardController';
import { requirePermission } from '../../../accessControl/presentation/security/requirePermission';
import { prisma } from "@/infrastructure/database/prisma";
import { PrismaClient } from '@prisma/client';

export const createDraftDayScorecardRouter = (prisma: PrismaClient): Router => {
  const router = Router();
  const controller = new DraftDayScorecardController(prisma);


  router.post(
    '/events',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'CREATE'),
    controller.createEvent,
  );

  router.get(
    '/events',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'VIEW'),
    controller.listEvents,
  );

  router.get(
    '/events/:draftEventId',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'VIEW'),
    controller.getEvent,
  );

  router.get(
    '/events/:draftEventId/scorecard',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'VIEW'),
    controller.getEventScorecard,
  );

  router.get(
    '/events/:draftEventId/teams/:teamId',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'VIEW'),
    controller.getTeamScorecard,
  );
  
  router.post(
    '/events/:draftEventId/seed-picks',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'RUN'),
    controller.seedPicks,
  );

  router.put(
    '/picks/:draftPickId',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'EDIT'),
    controller.updatePick,
  );

  router.patch(
    '/picks/:draftPickId/on-clock',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'EDIT'),
    controller.markOnClock,
  );

  router.patch(
    '/picks/:draftPickId/complete',
    requirePermission(prisma,'DRAFT_DAY_SCORECARD', 'EDIT'),
    controller.completePick,
  );

  return router;
};