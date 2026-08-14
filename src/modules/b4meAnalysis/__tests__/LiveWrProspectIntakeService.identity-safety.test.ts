import { describe, expect, it, vi } from 'vitest';
import { LiveWrProspectIntakeService } from '../application/services/LiveWrProspectIntakeService';

describe('LiveWrProspectIntakeService identity safety', () => {
  it('queues identity review and does not write metrics when provider resolves a different name', async () => {
    const liveProvider = { findByPlayerName: vi.fn().mockResolvedValue({
      playerName:'Kevin Concepcion', firstName:'Kevin', lastName:'Concepcion', school:'Texas A&M', draftYear:2026, position:'WR',
      sourceMetadata:{ provider:'HYBRID_PUBLIC', playerSearchName:'KC Concepcion', resolvedPlayerName:'Kevin Concepcion', draftYear:2026, sourcesUsed:[] },
      metrics:{},
    }) };
    const prospectWrite = { upsertWideReceiverFromLivePayload: vi.fn() };
    const metricsWrite = { upsertFromLivePayload: vi.fn() };
    const identities = { hasOpenIdentityIssue: vi.fn().mockResolvedValue(false), createIdentityReview: vi.fn().mockResolvedValue(1) };
    const service = new LiveWrProspectIntakeService(liveProvider as never, prospectWrite as never, metricsWrite as never, identities as never);
    const result = await service.getOrCreateFromLiveSource('KC Concepcion', 2026, 905);
    expect(result).toBeNull();
    expect(metricsWrite.upsertFromLivePayload).not.toHaveBeenCalled();
    expect(prospectWrite.upsertWideReceiverFromLivePayload).not.toHaveBeenCalled();
    expect(identities.createIdentityReview).toHaveBeenCalledWith(expect.objectContaining({ prospectId:905, requestedName:'KC Concepcion', resolvedName:'Kevin Concepcion', reason:'LOW_CONFIDENCE_PROVIDER_MATCH' }));
  });
});
