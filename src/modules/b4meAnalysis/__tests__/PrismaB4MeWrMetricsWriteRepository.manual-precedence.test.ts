import { describe, expect, it, vi } from 'vitest';
import { PrismaB4MeWrMetricsWriteRepository } from '../infrastructure/repositories/PrismaB4MeWrMetricsWriteRepository';

describe('PrismaB4MeWrMetricsWriteRepository manual precedence', () => {
  it('preserves manual Big 4 values when a live payload hydrates the same prospect', async () => {
    const update = vi.fn().mockResolvedValue({});
    const upsert = vi.fn().mockResolvedValue({});
    const prisma = {
      b4MeWRMetrics: {
        findUnique: vi.fn().mockResolvedValue({
          prospectId: 1, yprr: 2.44, pffOverallGrade: 88, contestedCatchRate: 76.9, behindLosTargetRate: 10.5,
          sourceMetadataJson: { manualObservation: { sourceType: 'MANUAL', fields: ['yprr','pffOverallGrade','contestedCatchRate','behindLosTargetRate'], sourceName: 'Jets X-Factor', metricSeasonYear: 2025 } }
        }),
        upsert, update
      }
    };
    const repo = new PrismaB4MeWrMetricsWriteRepository(prisma as never);
    await repo.upsertFromLivePayload(1, {
      playerName: 'Denzel Boston', firstName: 'Denzel', lastName: 'Boston', school: 'Washington', draftYear: 2026, position: 'WR',
      metrics: {
        yprr: 9.99, pffOverallGrade: 1, contestedCatchRate: 2, behindLosTargetRate: 99, receptions: 1, targets: 2,
        missedTacklesForcedPerReception: null, yacAfterContactPerReception: null, routesRun: 3, gamesPlayed: 1, gamesMissed: 0,
        competitionLevel: 'POWER', offensiveContextNotes: null, qbPlayQuality: null, pffRank: null, yprrRank: null, pressManWinRate: null,
        releasePackageDepth: null, routeFamilyDiversity: null, alignmentFlexibilityIndex: null, rolePortabilityIndex: null, usageAdaptabilityIndex: null,
        slotRate: null, wideRate: null, boundaryRate: null
      },
      sourceMetadata: { provider: 'HYBRID_PUBLIC', playerSearchName: 'Denzel Boston', resolvedPlayerName: 'Denzel Boston', draftYear: 2026, sourcesUsed: ['Live'], observedFields: ['receptions'], derivedFields: ['yprr'], metricSeasonYear: 2025, seasonSelectionPolicy: 'FINAL_COLLEGE_SEASON', injuryMissedGamesIsConfirmedOnly: true, notes: [] }
    });
    expect(upsert).toHaveBeenCalled();
    const args = upsert.mock.calls[0][0];
    expect(Number(args.update.yprr)).toBe(2.44);
    expect(Number(args.update.pffOverallGrade)).toBe(88);
    expect(Number(args.update.contestedCatchRate)).toBe(76.9);
    expect(Number(args.update.behindLosTargetRate)).toBe(10.5);
  });
});
