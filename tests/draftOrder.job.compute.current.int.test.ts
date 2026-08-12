import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { InProcessJobRunner } from '../src/infrastructure/queue/InProcessJobRunner';
import { JobLogEmitter } from '../src/infrastructure/queue/JobLogEmitter';

import { PrismaJobRepository } from '../src/infrastructure/repositories/PrismaJobRepository';
import { PrismaJobLogRepository } from '../src/infrastructure/repositories/PrismaJobLogRepository';

import { QueueJobService } from '../src/application/jobs/services/QueueJobService';
import { RunJobService } from '../src/application/jobs/services/RunJobService';

import { JobType } from '../src/domain/jobs/value-objects/JobType';
import { registerAppJobHandlers } from '../src/infrastructure/queue/registerAppJobHandlers';
import { buildDraftOrderComposition } from '../src/modules/draftOrder/moduleComposition';

describe('DraftOrder job — queue + run produces snapshotId', () => {
  const prisma = new PrismaClient();

  const TEST_YEAR = '2098';
  const TEST_SEASON_TYPE = 2;
  const TEST_WEEK = 1;

  let homeTeamId = 0;
  let awayTeamId = 0;
  let createdJobId = 0;

  beforeAll(async () => {
    const teams = await prisma.team.findMany({
      take: 2,
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (teams.length < 2) throw new Error('Need at least 2 teams in DB to run integration test');

    homeTeamId = teams[0].id;
    awayTeamId = teams[1].id;

    await prisma.game.deleteMany({
      where: { seasonYear: TEST_YEAR, seasonType: TEST_SEASON_TYPE },
    });

    await prisma.game.create({
      data: {
        seasonYear: TEST_YEAR,
        seasonType: TEST_SEASON_TYPE,
        gameWeek: TEST_WEEK,
        homeTeamId,
        awayTeamId,
        homeScore: 17,
        awayScore: 20, // home loses
        gameStatus: 'final',
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    if (createdJobId > 0) {
      await prisma.jobLog.deleteMany({ where: { jobId: createdJobId } });
      await prisma.job.deleteMany({ where: { id: createdJobId } });
    }

    await prisma.draftOrderTiebreakAudit.deleteMany({
      where: {
        DraftOrderEntry: {
          snapshot: {
            seasonYear: TEST_YEAR,
          },
        },
      },
    });

    await prisma.draftOrderEntry.deleteMany({
      where: {
        snapshot: {
          seasonYear: TEST_YEAR,
        },
      },
    });

    await prisma.draftOrderSnapshot.deleteMany({
      where: { seasonYear: TEST_YEAR },
    });

    await prisma.game.deleteMany({
      where: { seasonYear: TEST_YEAR, seasonType: TEST_SEASON_TYPE },
    });

    await prisma.$disconnect();
  });

  it('queues and runs DRAFT_ORDER_COMPUTE(current) and writes snapshotId to job result', async () => {
    const runner = new InProcessJobRunner();
    const emitter = new JobLogEmitter();

    const jobRepo = new PrismaJobRepository(prisma);
    const logRepo = new PrismaJobLogRepository(prisma);

    // Build draft-order usecases via your composition root
    const draftOrder = buildDraftOrderComposition(prisma);

    // register handlers (NFL_EVENTS_WEEKLY + DRAFT_ORDER_COMPUTE)
    // syncWeekEventsSvc is required by registerAppJobHandlers; compose it the same way you do elsewhere.
    // If your buildDraftOrderComposition doesn't provide it, grab it from your usual DI or instantiate similarly.
    // Here we use the same approach as your dependencies.ts: SyncWeekEventsService(gameRepo, teamRepo)
    const gameRepository = new (
      await import('../src/infrastructure/repositories/PrismaGameRepository')
    ).PrismaGameRepository(prisma);
    const teamRepository = new (
      await import('../src/infrastructure/repositories/PrismaTeamRepository')
    ).PrismaTeamRepository();

    const { SyncWeekEventsService } = await import(
      '../src/application/schedule/services/SyncWeekEventsService'
    );
    const syncWeekEventsSvc = new SyncWeekEventsService(gameRepository, teamRepository);

    registerAppJobHandlers(runner, {
      syncWeekEventsSvc,
      computeCurrentDraftOrderUc: draftOrder.computeCurrentUc,
      computeProjectedDraftOrderUc: draftOrder.computeProjectedUc,
    });

    const queueSvc = new QueueJobService(jobRepo);
    const runSvc = new RunJobService(jobRepo, logRepo, runner, emitter);

    const job = await queueSvc.execute({
      type: JobType.DRAFT_ORDER_COMPUTE,
      payload: {
        mode: 'current',
        seasonYear: TEST_YEAR,
        seasonType: TEST_SEASON_TYPE,
        throughWeek: TEST_WEEK,
      },
    });

    if (!job.id) throw new Error('Queued job is missing id');
    createdJobId = job.id;

    const finished = await runSvc.execute(job.id);

    // confirm job finished + has snapshot id
    expect(finished.status).toBeDefined();
    expect(finished.resultJson).toBeTruthy();

    const result = finished.resultJson as unknown;
    const asObj =
      typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : null;

    expect(asObj).toBeTruthy();
    expect(typeof asObj!['snapshotId']).toBe('number');

    const snapshotId = asObj!['snapshotId'] as number;
    expect(snapshotId).toBeGreaterThan(0);

    const snapshot = await prisma.draftOrderSnapshot.findUnique({
      where: { id: snapshotId },
      select: { id: true, seasonYear: true, mode: true },
    });

    expect(snapshot).toBeTruthy();
    expect(snapshot!.seasonYear).toBe(TEST_YEAR);
    expect(snapshot!.mode).toBe('current');
  });
});
