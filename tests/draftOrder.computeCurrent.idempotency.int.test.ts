import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

import { PrismaGameFactsRepository } from '../src/modules/draftOrder/infrastructure/persistence/prisma/PrismaGameFactsRepository';
import { PrismaDraftOrderSnapshotRepository } from '../src/modules/draftOrder/infrastructure/persistence/prisma/PrismaDraftOrderSnapshotRepository';
import { ComputeCurrentDraftOrderService } from '../src/modules/draftOrder/application/services/ComputeCurrentDraftOrderService';
import { ComputeCurrentDraftOrderUseCaseImpl } from '../src/modules/draftOrder/application/usecases/impl/ComputeCurrentDraftOrderUseCaseImpl';
import type {
  DraftOrderSnapshotDetailDto,
  DraftOrderEntryDetailDto,
} from '../src/modules/draftOrder/application/dtos/DraftOrderSnapshotDetailDto';

/**
 * Integration coverage:
 * - GameFactsRepository (Prisma)
 * - ComputeCurrentDraftOrderUseCaseImpl
 * - ComputeCurrentDraftOrderService (hash determinism + ordering)
 * - DraftOrderSnapshotRepository.createSnapshot idempotency path (unique -> existing)
 */

describe('DraftOrder compute current — creates snapshot and is idempotent', () => {
  const prisma = new PrismaClient();

  const TEST_YEAR = '2099';
  const TEST_SEASON_TYPE = 2;
  const TEST_WEEK = 1;

  let homeTeamId = 0;
  let awayTeamId = 0;

  beforeAll(async () => {
    // pick two existing teams (avoids guessing required Team fields)
    const teams = await prisma.team.findMany({
      take: 2,
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (teams.length < 2) throw new Error('Need at least 2 teams in DB to run integration test');

    homeTeamId = teams[0].id;
    awayTeamId = teams[1].id;

    // ensure no leftovers
    await prisma.game.deleteMany({
      where: { seasonYear: TEST_YEAR, seasonType: TEST_SEASON_TYPE },
    });

    // seed ONE final game with scores
    await prisma.game.create({
      data: {
        seasonYear: TEST_YEAR,
        seasonType: TEST_SEASON_TYPE,
        gameWeek: TEST_WEEK,
        homeTeamId,
        awayTeamId,
        homeScore: 24,
        awayScore: 10,
        gameStatus: 'final',
      },
      select: { id: true },
    });
  });

  afterAll(async () => {
    // Clean snapshots (cascade preferred, but delete children explicitly to be safe)
    // audits -> entries -> snapshots
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

  it('creates snapshot and returns same id on repeated execute (idempotent)', async () => {
    const gamesRepo = new PrismaGameFactsRepository(prisma);
    const snapshotRepo = new PrismaDraftOrderSnapshotRepository(prisma);
    const svc = new ComputeCurrentDraftOrderService();

    const uc = new ComputeCurrentDraftOrderUseCaseImpl(gamesRepo, snapshotRepo, svc);

    const dto1 = await uc.execute({
      seasonYear: TEST_YEAR,
      seasonType: TEST_SEASON_TYPE,
      throughWeek: TEST_WEEK,
    });

    const dto2 = await uc.execute({
      seasonYear: TEST_YEAR,
      seasonType: TEST_SEASON_TYPE,
      throughWeek: TEST_WEEK,
    });

    expect(dto1.id).toBeGreaterThan(0);
    expect(dto2.id).toBe(dto1.id);

    // should include both teams touched by the seeded game
    expect(dto1.entries.length).toBe(2);

    // ordering: worse record should draft earlier — away lost, so away should be slot 1

    const entries: ReadonlyArray<DraftOrderEntryDetailDto> = (dto1 as DraftOrderSnapshotDetailDto)
      .entries;

    const slot1 = entries.find((e) => e.draftSlot === 1);

    if (!slot1) throw new Error('Expected an entry with draftSlot=1');

    expect(slot1).toBeTruthy();
    expect(slot1!.team.id).toBe(awayTeamId);
  });
});
