import { describe, expect, it, vi } from 'vitest';
import { EvaluateB4MeWrProspectsJobHandler } from '../application/services/EvaluateB4MeWrProspectsJobHandler';

describe('EvaluateB4MeWrProspectsJobHandler', () => {
  it('skips an unresolved duplicate without calling the provider and completes the class job', async () => {
    const jobs = {
      updateJobProgress: vi.fn().mockResolvedValue(undefined),
      appendJobLog: vi.fn().mockResolvedValue(undefined),
      completeJob: vi.fn().mockResolvedValue(undefined),
    };
    const seeds = {
      findWideReceiversByYear: vi.fn().mockResolvedValue([
        { prospectId: 44, playerName: 'Duplicate Receiver', school: 'Test U', draftYear: 2026 },
      ]),
    };
    const identities = {
      hasOpenDuplicateIssue: vi.fn().mockResolvedValue(true),
      hasOpenIdentityIssue: vi.fn().mockResolvedValue(false),
    };
    const frameworks = {
      findActiveWrFramework: vi.fn().mockResolvedValue({ id: 1n, frameworkVersion: 'wr-test-v1' }),
    };
    const intake = { getOrCreateFromLiveSource: vi.fn() };

    const handler = new EvaluateB4MeWrProspectsJobHandler(
      jobs as never,
      seeds as never,
      { searchWideReceivers: vi.fn() } as never,
      { findByProspectId: vi.fn() } as never,
      { findStoredWrEvaluation: vi.fn(), createStoredWrEvaluation: vi.fn() } as never,
      identities as never,
      frameworks as never,
      intake as never,
      {} as never,
      {} as never,
      {} as never,
      3,
    );

    await handler.execute({
      id: 900,
      type: 'EVALUATE_B4ME_WR_PROSPECTS',
      status: 'in_progress',
      payload: {
        draftYear: 2026,
        positionGroup: 'WR',
        refreshPolicy: 'MISSING_OR_STALE',
        scoringMode: 'BASE_PLUS_CONTEXT',
      },
      createdAt: new Date(),
      startedAt: new Date(),
      finishedAt: null,
      cancelAt: null,
      cancelReason: null,
      resultCode: null,
      resultJson: null,
      errorMessage: null,
      progressPercent: 0,
      totalItems: 0,
      processedItems: 0,
      requestedByPersonId: null,
    });

    expect(intake.getOrCreateFromLiveSource).not.toHaveBeenCalled();
    expect(jobs.completeJob).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 900,
      resultCode: 'OK',
      resultJson: expect.objectContaining({
        total: 1,
        duplicateReviewRequired: 1,
        failed: 0,
      }),
    }));
    expect(jobs.updateJobProgress).toHaveBeenLastCalledWith({
      jobId: 900,
      totalItems: 1,
      processedItems: 1,
      progressPercent: 100,
    });
  });
});
